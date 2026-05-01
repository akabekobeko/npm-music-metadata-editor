import { Buffer } from "node:buffer";
import type { OggCodecInfo } from "../types.js";
import { OPUS_HEAD_MAGIC, OPUS_SAMPLE_RATE, OPUS_TAGS_MAGIC } from "./constants.js";
import { startsWith } from "./startsWith.js";

/**
 * Test whether `packet` is an `OpusHead` identification packet.
 *
 * @param packet - Candidate packet bytes (typically the BOS packet).
 * @returns `true` when the packet begins with `"OpusHead"`.
 */
export const isOpusIdPacket = (packet: Uint8Array): boolean => startsWith(packet, OPUS_HEAD_MAGIC);

/**
 * Test whether `packet` is an `OpusTags` comment packet.
 *
 * @param packet - Candidate packet bytes.
 * @returns `true` when the packet begins with `"OpusTags"`.
 */
export const isOpusCommentPacket = (packet: Uint8Array): boolean =>
  startsWith(packet, OPUS_TAGS_MAGIC);

/**
 * Decode the static fields of an `OpusHead` packet.
 *
 * Layout (RFC 7845 §5.1): magic (8 bytes) + version (1) + channel_count (1) +
 * pre_skip (2) + input_sample_rate (4) + output_gain (2) +
 * channel_mapping_family (1) [+ channel_mapping_table when family > 0]. We
 * report `OPUS_SAMPLE_RATE` for `sampleRate` because Opus decodes to 48 kHz
 * internally regardless of the informational `input_sample_rate` field.
 *
 * @param packet - `OpusHead` packet bytes.
 * @returns The decoded codec info.
 * @throws RangeError when the packet is too short or fails the magic check.
 */
export const parseOpusIdPacket = (packet: Uint8Array): OggCodecInfo => {
  if (!isOpusIdPacket(packet)) {
    throw new RangeError("parseOpusIdPacket: packet does not carry the OpusHead magic");
  }

  if (packet.length < 19) {
    throw new RangeError(`parseOpusIdPacket: packet too short (${packet.length} bytes)`);
  }

  const view = Buffer.from(packet.buffer, packet.byteOffset, packet.byteLength);
  return {
    codec: "opus",
    channels: view.readUInt8(9),
    sampleRate: OPUS_SAMPLE_RATE,
  };
};

/**
 * Strip the `OpusTags` magic from `packet` and return the inner Vorbis
 * Comment block bytes.
 *
 * Opus comment packets reuse the Vorbis Comment layout verbatim (no framing
 * bit suffix), so the returned bytes feed straight into `readVorbisComment`.
 *
 * @param packet - Comment packet bytes (`"OpusTags" + body`).
 * @returns The body bytes ready to feed to `readVorbisComment`.
 * @throws RangeError when the magic is missing.
 */
export const stripOpusCommentMagic = (packet: Uint8Array): Uint8Array => {
  if (!isOpusCommentPacket(packet)) {
    throw new RangeError("stripOpusCommentMagic: packet does not carry the OpusTags magic");
  }

  return packet.subarray(OPUS_TAGS_MAGIC.length);
};
