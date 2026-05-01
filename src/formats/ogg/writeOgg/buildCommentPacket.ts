import { Buffer } from "node:buffer";
import type { VorbisComment } from "../../../tags/vorbisComment/types.js";
import { writeVorbisComment } from "../../../tags/vorbisComment/writeVorbisComment.js";
import { OPUS_TAGS_MAGIC, VORBIS_COMMENT_MAGIC } from "../streams/constants.js";
import type { OggCodec } from "../types.js";

/**
 * Build the byte representation of a comment packet for the given codec.
 *
 * Both Vorbis and Opus reuse the Vorbis Comment block layout, but with
 * different prefixes / suffixes:
 * - Vorbis: `0x03 + "vorbis"` magic, body, then a single `0x01` framing bit
 *   (the framing bit is *part of the packet*, not the comment block itself).
 * - Opus: `"OpusTags"` magic followed by the body. No framing bit.
 *
 * @param tag - The Vorbis Comment block to encode.
 * @param codec - Codec identifier from the BOS packet.
 * @returns Packet bytes ready to splice into a re-paged Ogg stream.
 */
export const buildCommentPacket = (tag: VorbisComment, codec: OggCodec): Uint8Array => {
  const body = writeVorbisComment(tag);
  if (codec === "vorbis") {
    // Append the framing bit (`0x01`) so Vorbis decoders accept the packet.
    const out = Buffer.concat([VORBIS_COMMENT_MAGIC, body, new Uint8Array([0x01])]);
    return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
  }

  const out = Buffer.concat([OPUS_TAGS_MAGIC, body]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
