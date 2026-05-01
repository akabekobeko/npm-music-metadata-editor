/**
 * CRC32 polynomial used by the Ogg framing layer (RFC 3533 §6).
 *
 * The Ogg variant is "shifting MSB first, no reflection, no final XOR" — it is
 * NOT the same polynomial as zlib / Ethernet CRC, hence the dedicated
 * implementation kept in this module rather than reaching for a generic
 * CRC32 library.
 */
const POLYNOMIAL = 0x04c11db7;

/** Number of entries in the CRC lookup table (one per byte value). */
const TABLE_SIZE = 256;

/**
 * Build the 256-entry lookup table for {@link crc32Ogg}.
 *
 * Computed once at module load. The math follows the canonical "MSB-first"
 * recurrence from RFC 3533 — every iteration shifts left and conditionally
 * XORs the polynomial when the high bit is set.
 *
 * @returns The pre-computed CRC table.
 */
const buildCrcTable = (): Uint32Array => {
  const table = new Uint32Array(TABLE_SIZE);
  for (let n = 0; n < TABLE_SIZE; n++) {
    let crc = (n << 24) >>> 0;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x80000000) !== 0 ? ((crc << 1) ^ POLYNOMIAL) >>> 0 : (crc << 1) >>> 0;
    }

    table[n] = crc;
  }

  return table;
};

const CRC_TABLE = buildCrcTable();

/**
 * Compute the Ogg CRC32 checksum over `data`.
 *
 * The Ogg page header reserves bytes 22..25 for the checksum; callers must
 * zero those four bytes within `data` before invoking this function (per the
 * RFC, the CRC is computed *as if* the field were `0`).
 *
 * @param data - Bytes to checksum (typically a full page header + payload).
 * @returns The 32-bit CRC value as an unsigned `number`.
 */
export const crc32Ogg = (data: Uint8Array): number => {
  let crc = 0;
  // Index access is necessary; high-order array helpers cannot express the
  // running CRC accumulator without unnecessary allocations per byte.
  for (let i = 0; i < data.length; i++) {
    const tableIndex = ((crc >>> 24) ^ (data[i] ?? 0)) & 0xff;
    crc = (((crc << 8) >>> 0) ^ (CRC_TABLE[tableIndex] ?? 0)) >>> 0;
  }

  return crc >>> 0;
};
