import { Buffer } from "node:buffer";
import type { PictureInfo, PictureKindValue } from "../../../types.js";
import { PictureKind } from "../../../types.js";

/**
 * Decode a FLAC `PICTURE` metadata block body into a {@link PictureInfo}.
 *
 * Layout (all integers are 32-bit big-endian unsigned):
 * `pic_type | mime_len + mime | desc_len + desc(utf8) | width | height |
 *  color_depth | color_num | data_len + data`.
 *
 * Width / height / colour-depth / palette-size fields are informational and
 * are not surfaced on {@link PictureInfo} — the writer rebuilds them from the
 * raw bytes when re-encoding (see {@link pictureToFlacPicture}).
 *
 * @param body - The block body bytes (header already consumed).
 * @returns The decoded picture, or `undefined` when the body is malformed.
 */
export const flacPictureToPicture = (body: Uint8Array): PictureInfo | undefined => {
  if (body.length < 32) {
    return undefined;
  }

  const view = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  let pos = 0;

  const pictureType = view.readUInt32BE(pos);
  pos += 4;

  const mimeLen = view.readUInt32BE(pos);
  pos += 4;
  if (pos + mimeLen > view.length) {
    return undefined;
  }

  const mimeType = view.toString("ascii", pos, pos + mimeLen);
  pos += mimeLen;

  if (pos + 4 > view.length) {
    return undefined;
  }

  const descLen = view.readUInt32BE(pos);
  pos += 4;
  if (pos + descLen > view.length) {
    return undefined;
  }

  const description = view.toString("utf8", pos, pos + descLen);
  pos += descLen;

  // Width / height / colorDepth / colorNum (informational; skipped here).
  if (pos + 16 > view.length) {
    return undefined;
  }

  pos += 16;

  if (pos + 4 > view.length) {
    return undefined;
  }

  const dataLen = view.readUInt32BE(pos);
  pos += 4;
  if (pos + dataLen > view.length) {
    return undefined;
  }

  // Slice copies into a fresh buffer so callers can retain the bytes safely.
  const data = body.slice(pos, pos + dataLen);
  return {
    mimeType,
    kind: (pictureType as PictureKindValue) ?? PictureKind.Other,
    description,
    data,
  };
};
