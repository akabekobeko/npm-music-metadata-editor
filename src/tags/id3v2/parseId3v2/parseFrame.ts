import { Buffer } from "node:buffer";
import { decodeSyncSafeInt32 } from "../../../utils/syncSafeInt.js";
import { ID3V2_2_TO_2_3_FRAME_ID } from "../constants.js";
import type { Id3v2Frame, Id3v2FrameFlags, Id3v2MajorVersion } from "../types.js";
import { removeUnsynchronization } from "../unsynchronization.js";

/** Empty frame-flag set, used for ID3v2.2 frames (which carry no flag bytes). */
const NO_FLAGS: Id3v2FrameFlags = {
  tagAlterPreservation: false,
  fileAlterPreservation: false,
  readOnly: false,
  groupingIdentity: false,
  compression: false,
  encryption: false,
  unsynchronization: false,
  dataLengthIndicator: false,
};

/** Outcome of parsing one frame. */
export type ParseFrameResult =
  | { kind: "frame"; frame: Id3v2Frame; consumed: number }
  | { kind: "padding" }
  | { kind: "error"; consumed: number; reason: string };

type ParseFrameArgs = {
  /** Tag-body bytes (already de-unsynchronised at the tag level when applicable). */
  body: Uint8Array;
  /** Offset within `body` to start parsing. */
  offset: number;
  /** ID3v2 major version dictating header layout (3 / 4 bytes for ID, sync-safe size, flags). */
  majorVersion: Id3v2MajorVersion;
};

/**
 * Read a single frame starting at `args.offset`.
 *
 * Returns `{ kind: "padding" }` when the next byte is `0x00` (padding marks the
 * end of the frame stream); `{ kind: "error" }` when the frame header is
 * malformed (size overflows the body, unknown layout); or `{ kind: "frame" }`
 * with the parsed frame and the number of bytes consumed.
 */
export const parseFrame = (args: ParseFrameArgs): ParseFrameResult => {
  const { body, offset, majorVersion } = args;
  if (offset >= body.length || body[offset] === 0x00) {
    return { kind: "padding" };
  }

  return majorVersion === 2 ? parseV22Frame(body, offset) : parseV23OrV24Frame(args);
};

/** ID3v2.2 frame layout: 3-byte ID + 3-byte size + body (no flags, no unsync flag). */
const parseV22Frame = (body: Uint8Array, offset: number): ParseFrameResult => {
  if (offset + 6 > body.length) {
    return { kind: "error", consumed: body.length - offset, reason: "truncated v2.2 frame" };
  }

  const idBytes = body.subarray(offset, offset + 3);
  const id22 = Buffer.from(idBytes).toString("latin1");
  const size =
    (body[offset + 3] as number) * 0x10000 +
    (body[offset + 4] as number) * 0x100 +
    (body[offset + 5] as number);
  const dataStart = offset + 6;
  if (dataStart + size > body.length) {
    return {
      kind: "error",
      consumed: body.length - offset,
      reason: `v2.2 frame "${id22}" overflows tag body`,
    };
  }

  const data = body.subarray(dataStart, dataStart + size);
  // Promote to v2.3/2.4 ID so downstream parsers share one path.
  const id = ID3V2_2_TO_2_3_FRAME_ID[id22] ?? id22;
  return {
    kind: "frame",
    frame: { id, flags: NO_FLAGS, data },
    consumed: 6 + size,
  };
};

/** ID3v2.3 / ID3v2.4 frame layout: 4-byte ID + 4-byte size + 2-byte flags + body. */
const parseV23OrV24Frame = (args: ParseFrameArgs): ParseFrameResult => {
  const { body, offset, majorVersion } = args;
  if (offset + 10 > body.length) {
    return { kind: "error", consumed: body.length - offset, reason: "truncated v2.3+ frame" };
  }

  const idBytes = body.subarray(offset, offset + 4);
  const id = Buffer.from(idBytes).toString("latin1");
  const size =
    majorVersion === 4 ? decodeSyncSafeInt32(body, offset + 4) : readUInt32BE(body, offset + 4);
  const statusFlags = body[offset + 8] as number;
  const formatFlags = body[offset + 9] as number;
  const dataStart = offset + 10;
  if (dataStart + size > body.length) {
    return {
      kind: "error",
      consumed: body.length - offset,
      reason: `frame "${id}" size ${size} overflows tag body`,
    };
  }

  const flags = decodeFrameFlags({ statusFlags, formatFlags, majorVersion });
  let data = body.subarray(dataStart, dataStart + size);

  // ID3v2.4: when the frame uses its own unsynchronisation, undo it before exposing the body.
  if (majorVersion === 4 && flags.unsynchronization) {
    data = removeUnsynchronization(data);
  }

  // ID3v2.4: optional 4-byte data length indicator precedes the actual body.
  if (majorVersion === 4 && flags.dataLengthIndicator && data.length >= 4) {
    data = data.subarray(4);
  }

  return {
    kind: "frame",
    frame: { id, flags, data },
    consumed: 10 + size,
  };
};

type DecodeFrameFlagsArgs = {
  /** First flag byte (offset +8 within the frame header). */
  statusFlags: number;
  /** Second flag byte (offset +9 within the frame header). */
  formatFlags: number;
  /** ID3v2 major version (`3` and `4` differ in bit positions). */
  majorVersion: Id3v2MajorVersion;
};

/** Decode the two flag bytes into the typed {@link Id3v2FrameFlags} record. */
const decodeFrameFlags = (args: DecodeFrameFlagsArgs): Id3v2FrameFlags => {
  const { statusFlags, formatFlags, majorVersion } = args;
  if (majorVersion === 4) {
    return {
      tagAlterPreservation: (statusFlags & 0x40) !== 0,
      fileAlterPreservation: (statusFlags & 0x20) !== 0,
      readOnly: (statusFlags & 0x10) !== 0,
      groupingIdentity: (formatFlags & 0x40) !== 0,
      compression: (formatFlags & 0x08) !== 0,
      encryption: (formatFlags & 0x04) !== 0,
      unsynchronization: (formatFlags & 0x02) !== 0,
      dataLengthIndicator: (formatFlags & 0x01) !== 0,
    };
  }

  // ID3v2.3 layout — bit positions differ from v2.4.
  return {
    tagAlterPreservation: (statusFlags & 0x80) !== 0,
    fileAlterPreservation: (statusFlags & 0x40) !== 0,
    readOnly: (statusFlags & 0x20) !== 0,
    groupingIdentity: (formatFlags & 0x20) !== 0,
    compression: (formatFlags & 0x80) !== 0,
    encryption: (formatFlags & 0x40) !== 0,
    unsynchronization: false,
    dataLengthIndicator: false,
  };
};

/** Read a big-endian uint32 from an arbitrary byte offset (avoids constructing a `Buffer`). */
const readUInt32BE = (bytes: Uint8Array, offset: number): number => {
  return (
    (bytes[offset] as number) * 0x1000000 +
    ((bytes[offset + 1] as number) << 16) +
    ((bytes[offset + 2] as number) << 8) +
    (bytes[offset + 3] as number)
  );
};
