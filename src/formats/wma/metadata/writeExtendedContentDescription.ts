import { Buffer } from "node:buffer";
import { createBufferWriter } from "../../../io/bufferWriter/bufferWriter.js";
import { encodeText } from "../../../utils/encoding/encodeText.js";
import { encodeGuid } from "../asf/guid.js";
import { ASF_DESCRIPTOR_TYPE } from "../constants.js";
import type { ExtendedDescriptor } from "./types.js";

/**
 * Build an Extended Content Description Object payload from a list of
 * descriptors.
 *
 * The leading 16-bit count is followed by `descriptors.length` records — see
 * {@link readExtendedContentDescription} for the per-record layout. Empty
 * descriptor lists yield a 2-byte payload (`count = 0`).
 *
 * @param descriptors - Descriptors to emit, in destination order.
 * @returns Bytes of the Extended Content Description Object payload (the bytes
 *   that sit *after* the 24-byte ASF object header).
 */
export const writeExtendedContentDescription = (
  descriptors: readonly ExtendedDescriptor[],
): Uint8Array => {
  const writer = createBufferWriter();
  writer.writeUInt16LE(descriptors.length);
  for (const descriptor of descriptors) {
    const nameBytes = encodeNameWithTerminator(descriptor.name);
    const valueBytes = encodeValue(descriptor);
    writer.writeUInt16LE(nameBytes.length);
    writer.writeBytes(nameBytes);
    writer.writeUInt16LE(descriptor.type);
    writer.writeUInt16LE(valueBytes.length);
    writer.writeBytes(valueBytes);
  }

  const out = writer.concat();
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Encode `name` as null-terminated UTF-16LE (no BOM). */
const encodeNameWithTerminator = (name: string): Uint8Array => {
  const payload = encodeText(name, "utf16le");
  const out = Buffer.alloc(payload.length + 2);
  out.set(payload, 0);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/**
 * Project a typed descriptor value back into its on-disk byte form.
 *
 * When the descriptor was constructed by re-using `rawValue` from a parsed
 * source, we trust those bytes verbatim — that is what lets us round-trip
 * descriptors whose semantics we don't model. Descriptors built from scratch
 * (mapped from {@link TagData}) leave `rawValue` empty and rely on `value`.
 */
const encodeValue = (descriptor: ExtendedDescriptor): Uint8Array => {
  if (descriptor.rawValue.length > 0) {
    return descriptor.rawValue;
  }

  const { type, value } = descriptor;
  const view = (size: number): Buffer => Buffer.alloc(size);

  switch (type) {
    case ASF_DESCRIPTOR_TYPE.UnicodeString: {
      const bytes = encodeNameWithTerminator(String(value));
      return bytes;
    }
    case ASF_DESCRIPTOR_TYPE.Bool: {
      const buf = view(4);
      buf.writeUInt32LE(value ? 1 : 0, 0);
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    case ASF_DESCRIPTOR_TYPE.Dword: {
      const buf = view(4);
      buf.writeUInt32LE(Number(value), 0);
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    case ASF_DESCRIPTOR_TYPE.Qword: {
      const buf = view(8);
      buf.writeBigUInt64LE(typeof value === "bigint" ? value : BigInt(Number(value)), 0);
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    case ASF_DESCRIPTOR_TYPE.Word: {
      const buf = view(2);
      buf.writeUInt16LE(Number(value), 0);
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    case ASF_DESCRIPTOR_TYPE.Guid:
      return encodeGuid(String(value));
    default:
      return value instanceof Uint8Array ? value : new Uint8Array();
  }
};
