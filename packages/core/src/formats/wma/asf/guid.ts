import { Buffer } from "node:buffer";
import { ASF_GUID_SIZE } from "../constants.js";

/** Hex character lookup table; indexed `0x00`..`0xFF`. */
const HEX_PAIRS: readonly string[] = Array.from({ length: 256 }, (_, i) =>
  i.toString(16).padStart(2, "0").toUpperCase(),
);

/**
 * Decode a 16-byte ASF GUID into the canonical uppercase string form
 * (`XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`).
 *
 * ASF stores the first three groups in little-endian order while the last two
 * groups are raw bytes — this layout matches Microsoft's `GUID` struct on
 * disk. The string we return uses the standard hyphenated big-endian form,
 * so the same GUID is comparable regardless of where it came from.
 *
 * @param bytes - At least 16 bytes whose first 16 are the GUID.
 * @returns Canonical hyphenated GUID, all uppercase.
 * @throws when `bytes` is shorter than 16 bytes.
 */
export const decodeGuid = (bytes: Uint8Array): string => {
  if (bytes.length < ASF_GUID_SIZE) {
    throw new RangeError(`decodeGuid: need ${ASF_GUID_SIZE} bytes, got ${bytes.length}`);
  }

  const hex = (offset: number): string => HEX_PAIRS[bytes[offset] ?? 0] ?? "00";
  const group1 = `${hex(3)}${hex(2)}${hex(1)}${hex(0)}`;
  const group2 = `${hex(5)}${hex(4)}`;
  const group3 = `${hex(7)}${hex(6)}`;
  const group4 = `${hex(8)}${hex(9)}`;
  const group5 = `${hex(10)}${hex(11)}${hex(12)}${hex(13)}${hex(14)}${hex(15)}`;
  return `${group1}-${group2}-${group3}-${group4}-${group5}`;
};

/**
 * Encode a canonical GUID string back into the 16-byte ASF byte layout
 * (mixed-endian: first three groups little-endian, last two raw).
 *
 * @param guid - Canonical hyphenated GUID. Casing is irrelevant.
 * @returns A fresh 16-byte buffer ready to write to disk.
 * @throws when `guid` is not a 32-hex-digit GUID with the expected hyphenation.
 */
export const encodeGuid = (guid: string): Uint8Array => {
  const hex = guid.replace(/-/g, "");
  if (hex.length !== ASF_GUID_SIZE * 2 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new RangeError(`encodeGuid: invalid GUID literal "${guid}"`);
  }

  const raw = Buffer.from(hex, "hex");
  const out = Buffer.alloc(ASF_GUID_SIZE);
  // First DWORD: little-endian.
  out[0] = raw[3] ?? 0;
  out[1] = raw[2] ?? 0;
  out[2] = raw[1] ?? 0;
  out[3] = raw[0] ?? 0;
  // Two WORDs: little-endian.
  out[4] = raw[5] ?? 0;
  out[5] = raw[4] ?? 0;
  out[6] = raw[7] ?? 0;
  out[7] = raw[6] ?? 0;
  // Trailing 8 bytes: raw.
  raw.copy(out, 8, 8, 16);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
