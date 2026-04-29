/**
 * Encode a string as UTF-16BE bytes (no BOM).
 *
 * Implemented manually because Node.js `Buffer` only knows UTF-16LE; for the
 * BE case we emit the high byte first, low byte second, per code unit.
 *
 * @param value - String to encode.
 * @returns UTF-16BE bytes (`value.length * 2` bytes).
 */
export const encodeUtf16Be = (value: string): Uint8Array => {
  const out = new Uint8Array(value.length * 2);
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    out[i * 2] = (code >>> 8) & 0xff;
    out[i * 2 + 1] = code & 0xff;
  }

  return out;
};
