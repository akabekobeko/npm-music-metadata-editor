import { removeUnsynchronization } from "../../removeUnsynchronization.js";
import type { Id3v2FrameFlags, Id3v2MajorVersion } from "../../types.js";

/** Arguments for {@link unwrapV24FrameData}. */
type Args = {
  /** Raw frame body sliced from the tag body. */
  raw: Uint8Array;
  /** Decoded frame flags (the v2.4 unsync / data-length flags are inspected). */
  flags: Id3v2FrameFlags;
  /** ID3v2 major version; only `4` triggers any unwrapping. */
  majorVersion: Id3v2MajorVersion;
};

/**
 * Apply the two ID3v2.4-only transforms that wrap a frame body:
 *
 * 1. **Per-frame unsynchronisation** — `removeUnsynchronization` undoes the
 *    `0xFF 0x00` escapes inserted by the writer.
 * 2. **Data length indicator** — when present, the first 4 bytes of the body
 *    encode the un-unsynchronised length and must be stripped before the
 *    payload starts.
 *
 * Both transforms are no-ops for v2.2 / v2.3 frames and when the corresponding
 * flag is unset, so this function returns `args.raw` unchanged in those cases.
 *
 * @returns The unwrapped frame body ready to hand to a body-specific parser.
 */
export const unwrapV24FrameData = (args: Args): Uint8Array => {
  const isV24 = args.majorVersion === 4;
  const unsynced =
    isV24 && args.flags.unsynchronization ? removeUnsynchronization(args.raw) : args.raw;
  return isV24 && args.flags.dataLengthIndicator && unsynced.length >= 4
    ? unsynced.subarray(4)
    : unsynced;
};
