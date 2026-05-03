/**
 * Detect a picture's MIME type from its leading magic bytes.
 *
 * Recognised formats: PNG, JPEG, GIF, BMP, TIFF (both endians), WebP. Anything
 * else returns `undefined` so the caller can fall back to the MIME string the
 * source tag carried (or to `"image/octet-stream"`).
 *
 * @param data - Raw image bytes (only the first ~12 bytes are inspected).
 * @returns The detected MIME string, or `undefined` when no signature matches.
 */
export const detectMime = (data: Uint8Array): string | undefined => {
  if (data.length < 3) {
    return undefined;
  }

  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return "image/png";
  }

  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    return "image/gif";
  }

  if (data[0] === 0x42 && data[1] === 0x4d) {
    return "image/bmp";
  }

  if (data.length >= 4) {
    const isLittleEndianTiff =
      data[0] === 0x49 && data[1] === 0x49 && data[2] === 0x2a && data[3] === 0x00;
    const isBigEndianTiff =
      data[0] === 0x4d && data[1] === 0x4d && data[2] === 0x00 && data[3] === 0x2a;
    if (isLittleEndianTiff || isBigEndianTiff) {
      return "image/tiff";
    }
  }

  if (
    data.length >= 12 &&
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  ) {
    return "image/webp";
  }

  return undefined;
};
