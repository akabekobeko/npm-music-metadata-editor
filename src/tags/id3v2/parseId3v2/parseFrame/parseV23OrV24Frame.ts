import { Buffer } from "node:buffer";
import { decodeSyncSafeInt32 } from "../../../../utils/syncSafeInt/decodeSyncSafeInt32.js";
import { removeUnsynchronization } from "../../removeUnsynchronization.js";
import { decodeFrameFlags } from "./decodeFrameFlags.js";
import { readUInt32BE } from "./readUInt32BE.js";
import type { ParseFrameArgs, ParseFrameResult } from "./types.js";

/** ID3v2.3 / ID3v2.4 frame layout: 4-byte ID + 4-byte size + 2-byte flags + body. */
export const parseV23OrV24Frame = (args: ParseFrameArgs): ParseFrameResult => {
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
