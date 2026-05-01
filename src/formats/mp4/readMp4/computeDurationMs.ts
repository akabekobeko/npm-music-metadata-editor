import { Buffer } from "node:buffer";
import { findAtom } from "../atom/findAtom.js";
import type { Atom } from "../atom/types.js";

/**
 * Compute the audio duration of an MP4 / M4A file from its `moov/mvhd` atom.
 *
 * `mvhd` exposes a movie-wide `timescale` (Hz) and `duration` (in those
 * ticks). The duration in milliseconds is `duration / timescale × 1000`.
 *
 * Layout follows ISO/IEC 14496-12 — version 0 keeps the time fields as
 * 32-bit, version 1 widens them to 64-bit:
 * - `0`        u8 — version
 * - `1..3`     bytes — flags (ignored)
 * - version 0:
 *   - `4..7`   u32 — creation_time
 *   - `8..11`  u32 — modification_time
 *   - `12..15` u32 — timescale
 *   - `16..19` u32 — duration
 * - version 1:
 *   - `4..11`  u64 — creation_time
 *   - `12..19` u64 — modification_time
 *   - `20..23` u32 — timescale
 *   - `24..31` u64 — duration
 *
 * @param source - Whole-file bytes (where atom offsets point).
 * @param tree - Parsed top-level atoms from `parseAtomTree`.
 * @returns Duration in milliseconds, or `undefined` when `mvhd` is missing
 *   or its values cannot yield a positive duration.
 */
export const computeDurationMs = (
  source: Uint8Array,
  tree: readonly Atom[],
): number | undefined => {
  const mvhd = findAtom(tree, ["moov", "mvhd"]);
  if (mvhd === undefined || mvhd.payloadSize < 20) {
    return undefined;
  }

  const view = Buffer.from(source.buffer, source.byteOffset, source.byteLength);
  const version = view.readUInt8(mvhd.payloadOffset);
  const { timescale, duration } =
    version === 1
      ? readVersion1({ view, payloadOffset: mvhd.payloadOffset, payloadSize: mvhd.payloadSize })
      : readVersion0({ view, payloadOffset: mvhd.payloadOffset });
  if (timescale === 0 || duration === 0) {
    return undefined;
  }

  return Math.round((duration * 1000) / timescale);
};

/** Arguments for {@link readVersion0}. */
type Version0Args = {
  /** Buffer view over the whole source. */
  view: Buffer;
  /** Absolute byte offset of the `mvhd` payload. */
  payloadOffset: number;
};

/**
 * Decode the timescale + duration pair from the version-0 `mvhd` layout.
 *
 * @returns The timescale (Hz) and duration (in ticks).
 */
const readVersion0 = ({
  view,
  payloadOffset,
}: Version0Args): { timescale: number; duration: number } => ({
  timescale: view.readUInt32BE(payloadOffset + 12),
  duration: view.readUInt32BE(payloadOffset + 16),
});

/** Arguments for {@link readVersion1}. */
type Version1Args = {
  /** Buffer view over the whole source. */
  view: Buffer;
  /** Absolute byte offset of the `mvhd` payload. */
  payloadOffset: number;
  /** Length of the `mvhd` payload (must be at least 32 for version 1). */
  payloadSize: number;
};

/**
 * Decode the timescale + duration pair from the version-1 `mvhd` layout.
 *
 * Falls back to `0`/`0` (effectively "unknown") when the payload is
 * truncated below the version-1 minimum.
 *
 * @returns The timescale (Hz) and duration (in ticks).
 */
const readVersion1 = ({
  view,
  payloadOffset,
  payloadSize,
}: Version1Args): { timescale: number; duration: number } => {
  if (payloadSize < 32) {
    return { timescale: 0, duration: 0 };
  }

  const timescale = view.readUInt32BE(payloadOffset + 20);
  // The duration is a u64; sample-accurate playback never exceeds 2^53 ticks
  // even at 100 kHz timescale, so `Number(BigInt)` is safe in practice.
  const duration = Number(view.readBigUInt64BE(payloadOffset + 24));
  return { timescale, duration };
};
