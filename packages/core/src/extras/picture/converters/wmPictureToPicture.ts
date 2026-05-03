import { Buffer } from "node:buffer";
import type { PictureInfo, PictureKindValue } from "../../../types.js";
import { PictureKind } from "../../../types.js";
import { decodeText } from "../../../utils/encoding/decodeText.js";

/**
 * Decode a WMA `WM/Picture` value (raw bytes carried by an Extended Content
 * Description Object descriptor) into a {@link PictureInfo}.
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
 * @param raw - Bytes of the descriptor value (`rawValue` on the ASF descriptor).
 * @returns The decoded picture, or `undefined` when the body is malformed.
 */
export const wmPictureToPicture = (raw: Uint8Array): PictureInfo | undefined => {
  if (raw.length < 5) {
    return undefined;
  }

  const view = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength);
  const kind = (raw[0] as PictureKindValue) ?? PictureKind.Other;
  const dataLength = view.readUInt32LE(1);

  const mimeRange = sliceUtf16NullTerminated(raw, 5);
  if (mimeRange === undefined) {
    return undefined;
  }

  const descriptionRange = sliceUtf16NullTerminated(raw, mimeRange.endOffset);
  if (descriptionRange === undefined) {
    return undefined;
  }

  const dataStart = descriptionRange.endOffset;
  if (dataStart + dataLength > raw.length) {
    return undefined;
  }

  const description = decodeText(descriptionRange.bytes, "utf16le");
  return {
    mimeType: decodeText(mimeRange.bytes, "utf16le"),
    kind,
    description: description === "" ? undefined : description,
    data: raw.slice(dataStart, dataStart + dataLength),
  };
};

/**
 * Walk forward from `offset` until a UTF-16LE null terminator (`0x00 0x00`) is
 * found, returning the slice that precedes it plus the offset just past the
 * terminator.
 *
 * @param raw - Source bytes.
 * @param offset - Offset to start scanning from.
 * @returns The decoded slice + post-terminator offset, or `undefined` when no
 *   terminator was found before the end of the buffer.
 */
const sliceUtf16NullTerminated = (
  raw: Uint8Array,
  offset: number,
): { bytes: Uint8Array; endOffset: number } | undefined => {
  for (let i = offset; i + 1 < raw.length; i += 2) {
    if (raw[i] === 0x00 && raw[i + 1] === 0x00) {
      return { bytes: raw.subarray(offset, i), endOffset: i + 2 };
    }
  }

  return undefined;
};
