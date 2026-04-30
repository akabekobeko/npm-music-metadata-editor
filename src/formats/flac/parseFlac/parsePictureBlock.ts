import { Buffer } from "node:buffer";
import type { FlacPicture } from "../types.js";

/**
 * Decode a `PICTURE` metadata block body.
 *
 * Layout (all integers are 32-bit big-endian unsigned):
 * `pic_type | mime_len + mime | desc_len + desc(utf8) | width | height |
 *  color_depth | color_num | data_len + data`.
 *
 * @param body - The block body bytes (header already consumed).
 * @returns The decoded picture descriptor + raw image bytes.
 * @throws RangeError when any length field would extend past `body`.
 */
export const parsePictureBlock = (body: Uint8Array): FlacPicture => {
  const view = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  let pos = 0;

  const need = (count: number, label: string): void => {
    if (pos + count > view.length) {
      throw new RangeError(`parsePictureBlock: not enough bytes for ${label}`);
    }
  };

  need(4, "picture type");
  const pictureType = view.readUInt32BE(pos);
  pos += 4;

  need(4, "mime length");
  const mimeLen = view.readUInt32BE(pos);
  pos += 4;
  need(mimeLen, "mime string");
  const mimeType = view.toString("ascii", pos, pos + mimeLen);
  pos += mimeLen;

  need(4, "description length");
  const descLen = view.readUInt32BE(pos);
  pos += 4;
  need(descLen, "description string");
  const description = view.toString("utf8", pos, pos + descLen);
  pos += descLen;

  need(4, "width");
  const width = view.readUInt32BE(pos);
  pos += 4;
  need(4, "height");
  const height = view.readUInt32BE(pos);
  pos += 4;
  need(4, "color depth");
  const colorDepth = view.readUInt32BE(pos);
  pos += 4;
  need(4, "color num");
  const colorNum = view.readUInt32BE(pos);
  pos += 4;

  need(4, "data length");
  const dataLen = view.readUInt32BE(pos);
  pos += 4;
  need(dataLen, "data");
  // Slice copies into a new Uint8Array so callers can safely retain the bytes
  // even if the source FLAC buffer is later mutated.
  const data = body.slice(pos, pos + dataLen);

  return {
    pictureType,
    mimeType,
    description,
    width,
    height,
    colorDepth,
    colorNum,
    data,
  };
};
