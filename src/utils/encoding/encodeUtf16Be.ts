/**
 * Encode a string as UTF-16BE bytes (no BOM).
 *
 * Implemented manually because Node.js `Buffer` only knows UTF-16LE; for the
 * BE case we emit the high byte first, low byte second, per code unit.
 *
 * @param value - String to encode.
 * @returns UTF-16BE bytes (`value.length * 2` bytes).
 */
export const encodeUtf16Be = (value: string): Uint8Array =>
  Uint8Array.from(
    // Iterate by UTF-16 code units (string length), so surrogate pairs become two
    // independent BE code units — mirroring how UTF-16LE is laid out.
    Array.from({ length: value.length }, (_, i) => {
      const code = value.charCodeAt(i);
      return [(code >>> 8) & 0xff, code & 0xff];
    }).flat(),
  );
