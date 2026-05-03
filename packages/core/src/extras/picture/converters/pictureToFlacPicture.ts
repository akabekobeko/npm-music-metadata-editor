import { Buffer } from "node:buffer";
import type { PictureInfo } from "../../../types.js";

/**
 * Encode a {@link PictureInfo} as a FLAC `PICTURE` metadata block body.
 *
 * Layout (all integers are 32-bit big-endian unsigned):
 * `pic_type | mime_len + mime | desc_len + desc(utf8) | width | height |
 *  color_depth | color_num | data_len + data`.
 *
 * Width / height / colour-depth / palette-size are emitted as zero because
 * the public {@link PictureInfo} shape does not carry them; readers tolerate
 * zero values per the FLAC PICTURE block specification.
 *
 * @param picture - Picture descriptor + raw bytes.
 * @returns The block body bytes (no FLAC metadata block header).
 */
export const pictureToFlacPicture = (picture: PictureInfo): Uint8Array => {
  const mime = Buffer.from(picture.mimeType, "ascii");
  const description = Buffer.from(picture.description ?? "", "utf8");
  const total =
    4 + // picture type
    4 +
    mime.length + // mime length + mime
    4 +
    description.length + // description length + description
    4 + // width
    4 + // height
    4 + // color depth
    4 + // color num
    4 +
    picture.data.length; // data length + data

  const out = Buffer.alloc(total);
  let pos = 0;
  out.writeUInt32BE(picture.kind, pos);
  pos += 4;
  out.writeUInt32BE(mime.length, pos);
  pos += 4;
  mime.copy(out, pos);
  pos += mime.length;
  out.writeUInt32BE(description.length, pos);
  pos += 4;
  description.copy(out, pos);
  pos += description.length;
  // Width / height / color depth / colour count — zero out per the spec note.
  pos += 16;
  out.writeUInt32BE(picture.data.length, pos);
  pos += 4;
  out.set(picture.data, pos);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
