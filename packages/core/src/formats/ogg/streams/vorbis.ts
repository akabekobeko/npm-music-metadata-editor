import { Buffer } from "node:buffer";
import type { OggCodecInfo } from "../types.js";
import { VORBIS_COMMENT_MAGIC, VORBIS_ID_MAGIC } from "./constants.js";
import { startsWith } from "./startsWith.js";

/**
 * Test whether `packet` is a Vorbis identification header.
 *
 * @param packet - Candidate packet bytes (typically the BOS packet).
 * @returns `true` when the packet begins with `0x01 + "vorbis"`.
 */
export const isVorbisIdPacket = (packet: Uint8Array): boolean =>
  startsWith(packet, VORBIS_ID_MAGIC);

/**
 * Test whether `packet` is a Vorbis comment header.
 *
 * @param packet - Candidate packet bytes.
 * @returns `true` when the packet begins with `0x03 + "vorbis"`.
 */
export const isVorbisCommentPacket = (packet: Uint8Array): boolean =>
  startsWith(packet, VORBIS_COMMENT_MAGIC);

/**
 * Decode the static fields of a Vorbis identification packet.
 *
 * Layout (per Vorbis I §4.2.2): magic (7 bytes) + vorbis_version (4) +
 * channels (1) + sample_rate (4) + bitrate fields + blocksizes (1) +
 * framing bit (1). We expose only the codec, sample rate, and channel
 * count — the other fields are decoded by callers that need them.
 *
 * @param packet - Vorbis ID packet bytes.
 * @returns The decoded codec info.
 * @throws RangeError when the packet is too short or fails the magic check.
 */
export const parseVorbisIdPacket = (packet: Uint8Array): OggCodecInfo => {
  if (!isVorbisIdPacket(packet)) {
    throw new RangeError("parseVorbisIdPacket: packet does not carry the Vorbis ID magic");
  }

  if (packet.length < 16) {
    throw new RangeError(`parseVorbisIdPacket: packet too short (${packet.length} bytes)`);
  }

  const view = Buffer.from(packet.buffer, packet.byteOffset, packet.byteLength);
  return {
    codec: "vorbis",
    channels: view.readUInt8(11),
    sampleRate: view.readUInt32LE(12),
  };
};

/**
 * Strip the Vorbis comment-packet magic from `packet` and return the inner
 * Vorbis Comment block bytes (vendor + entries + framing bit).
 *
 * @param packet - Comment packet bytes (`0x03 + "vorbis" + body`).
 * @returns The body bytes ready to feed to `readVorbisComment`.
 * @throws RangeError when the magic is missing.
 */
export const stripVorbisCommentMagic = (packet: Uint8Array): Uint8Array => {
  if (!isVorbisCommentPacket(packet)) {
    throw new RangeError("stripVorbisCommentMagic: packet does not carry the Vorbis comment magic");
  }

  return packet.subarray(VORBIS_COMMENT_MAGIC.length);
};
