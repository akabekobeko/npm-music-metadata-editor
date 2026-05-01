import { Buffer } from "node:buffer";
import { decodeText } from "../../../utils/encoding/decodeText.js";
import { decodeGuid } from "../asf/guid.js";
import { ASF_DESCRIPTOR_TYPE } from "../constants.js";
import type { AsfDescriptorType, ExtendedDescriptor } from "./types.js";

/**
 * Decode an Extended Content Description Object payload.
 *
 * The payload begins with a 16-bit count of descriptors followed by that
 * many records of the form:
 *
 * ```
 *   nameLength (2 bytes LE)        | bytes
 *   name       (nameLength bytes)  | UTF-16LE, null-terminated
 *   dataType   (2 bytes LE)        | ASF_DESCRIPTOR_TYPE_*
 *   valueLen   (2 bytes LE)        | bytes
 *   value      (valueLen bytes)    | encoding depends on dataType
 * ```
 *
 * Both `name` and the typed `value` are normalised. The original bytes of
 * each value are preserved on `rawValue` so the writer can re-emit
 * descriptors it doesn't understand without re-encoding them.
 *
 * @param payload - Bytes of the Extended Content Description Object's payload
 *   (after the 24-byte object header).
 * @returns The descriptors in file order. Returns `[]` when the payload is
 *   too short to even read the count.
 */
export const readExtendedContentDescription = (
  payload: Uint8Array,
): readonly ExtendedDescriptor[] => {
  if (payload.length < 2) {
    return [];
  }

  const view = Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength);
  const count = view.readUInt16LE(0);
  const descriptors: ExtendedDescriptor[] = [];
  let cursor = 2;
  for (let i = 0; i < count; i++) {
    if (cursor + 2 > payload.length) {
      break;
    }

    const nameLen = view.readUInt16LE(cursor);
    cursor += 2;
    if (cursor + nameLen + 4 > payload.length) {
      break;
    }

    const name = stripUtf16Terminator(payload.subarray(cursor, cursor + nameLen));
    cursor += nameLen;

    const type = view.readUInt16LE(cursor) as AsfDescriptorType;
    cursor += 2;
    const valueLen = view.readUInt16LE(cursor);
    cursor += 2;
    if (cursor + valueLen > payload.length) {
      break;
    }

    const rawValue = payload.subarray(cursor, cursor + valueLen);
    descriptors.push({ name, type, rawValue, value: decodeValue(type, rawValue) });
    cursor += valueLen;
  }

  return descriptors;
};

/**
 * Decode a UTF-16LE string with a trailing null terminator (the on-disk form
 * the ASF spec mandates for descriptor names).
 *
 * @param bytes - Source bytes including any trailing UTF-16 nulls.
 * @returns The decoded string with the terminator stripped.
 */
const stripUtf16Terminator = (bytes: Uint8Array): string => {
  let end = bytes.length;
  while (end >= 2 && bytes[end - 1] === 0 && bytes[end - 2] === 0) {
    end -= 2;
  }

  return decodeText(bytes.subarray(0, end), "utf16le");
};

/**
 * Project a raw value into the appropriate JavaScript shape based on its
 * declared ASF type code.
 *
 * Unknown / malformed values fall back to `Uint8Array` so callers can still
 * round-trip them on write.
 *
 * @param type - ASF type code declared on the descriptor.
 * @param raw - Raw bytes of the descriptor value (length comes from the on-disk header).
 * @returns The decoded value as a JavaScript primitive (or the raw bytes for
 *   unrecognised type codes).
 */
const decodeValue = (
  type: AsfDescriptorType,
  raw: Uint8Array,
): string | number | bigint | boolean | Uint8Array => {
  const view = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength);
  switch (type) {
    case ASF_DESCRIPTOR_TYPE.UnicodeString:
      return stripUtf16Terminator(raw);
    case ASF_DESCRIPTOR_TYPE.Bool:
      return raw.length >= 4 ? view.readUInt32LE(0) !== 0 : false;
    case ASF_DESCRIPTOR_TYPE.Dword:
      return raw.length >= 4 ? view.readUInt32LE(0) : 0;
    case ASF_DESCRIPTOR_TYPE.Qword:
      return raw.length >= 8 ? view.readBigUInt64LE(0) : 0n;
    case ASF_DESCRIPTOR_TYPE.Word:
      return raw.length >= 2 ? view.readUInt16LE(0) : 0;
    case ASF_DESCRIPTOR_TYPE.Guid:
      return raw.length >= 16 ? decodeGuid(raw) : "";
    default:
      return raw;
  }
};
