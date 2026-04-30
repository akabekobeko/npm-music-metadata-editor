import { Buffer } from "node:buffer";
import type { Atom } from "../atom/types.js";
import type { ItunesDataValue } from "../types.js";

/** Number of bytes prepended to the raw value inside a `data` atom payload. */
const DATA_PREFIX_SIZE = 8;

/**
 * Decode one `data` atom's payload into a {@link ItunesDataValue}.
 *
 * The first 4 payload bytes hold the type indicator (top byte reserved, low
 * 24 bits = well-known type code), the next 4 bytes hold the locale, and the
 * remainder is the raw value.
 *
 * @param source - Whole-file bytes (used to read the atom's payload).
 * @param atom - The `data` atom to decode.
 * @returns The decoded value record.
 * @throws when the payload is shorter than the 8-byte prefix.
 */
export const parseDataAtom = (source: Uint8Array, atom: Atom): ItunesDataValue => {
  if (atom.payloadSize < DATA_PREFIX_SIZE) {
    throw new Error(
      `parseDataAtom: data atom at offset ${atom.offset} is too short (${atom.payloadSize} bytes)`,
    );
  }

  const view = Buffer.from(source.buffer, source.byteOffset + atom.payloadOffset, atom.payloadSize);
  const typeIndicator = view.readUInt32BE(0) & 0x00ffffff;
  const locale = view.readUInt32BE(4);
  const data = source.subarray(
    atom.payloadOffset + DATA_PREFIX_SIZE,
    atom.payloadOffset + atom.payloadSize,
  );
  return { typeIndicator, locale, data };
};
