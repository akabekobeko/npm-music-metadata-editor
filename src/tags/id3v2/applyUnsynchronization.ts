/**
 * Apply ID3v2 unsynchronisation: any `0xFF` followed by either `0x00–0x1F` or
 * a sync candidate `0xE0–0xFF` is escaped by inserting a `0x00` after it.
 *
 * The conservative (and spec-correct) implementation simply escapes *every*
 * `0xFF`, which is what every mainstream writer does.
 *
 * @param bytes - Source bytes.
 * @returns A new buffer with `0xFF` bytes followed by `0x00`.
 */
export const applyUnsynchronization = (bytes: Uint8Array): Uint8Array => {
  const extras = bytes.reduce((count, byte) => (byte === 0xff ? count + 1 : count), 0);
  if (extras === 0) {
    return bytes;
  }

  const out = new Uint8Array(bytes.length + extras);
  let writePos = 0;
  for (const byte of bytes) {
    out[writePos] = byte;
    writePos += 1;
    if (byte === 0xff) {
      out[writePos] = 0x00;
      writePos += 1;
    }
  }

  return out;
};
