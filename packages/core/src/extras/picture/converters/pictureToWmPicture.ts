import { Buffer } from "node:buffer";
import type { PictureInfo } from "../../../types.js";
import { encodeText } from "../../../utils/encoding/encodeText.js";

/**
 * Encode a {@link PictureInfo} as the raw value of a WMA `WM/Picture`
 * descriptor (Extended Content Description Object).
 *
 * Layout (little-endian throughout):
 * ```
 *   pictureType (1 byte)
 *   dataLength  (4 bytes UInt32)
 *   mimeType    (UTF-16LE + null terminator)
 *   description (UTF-16LE + null terminator)
 *   pictureData (dataLength bytes)
 * ```
 *
 * @param picture - Picture to encode.
 * @returns The bytes ready to assign to an `ExtendedDescriptor.rawValue`.
 */
export const pictureToWmPicture = (picture: PictureInfo): Uint8Array => {
  const mimeBytes = encodeText(picture.mimeType, "utf16le");
  const descBytes = encodeText(picture.description ?? "", "utf16le");
  const utf16Terminator = new Uint8Array([0x00, 0x00]);
  const total =
    1 + // picture type
    4 + // data length
    mimeBytes.length +
    utf16Terminator.length +
    descBytes.length +
    utf16Terminator.length +
    picture.data.length;

  const out = Buffer.alloc(total);
  let pos = 0;
  out[pos] = picture.kind;
  pos += 1;
  out.writeUInt32LE(picture.data.length, pos);
  pos += 4;
  out.set(mimeBytes, pos);
  pos += mimeBytes.length;
  out.set(utf16Terminator, pos);
  pos += utf16Terminator.length;
  out.set(descBytes, pos);
  pos += descBytes.length;
  out.set(utf16Terminator, pos);
  pos += utf16Terminator.length;
  out.set(picture.data, pos);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
