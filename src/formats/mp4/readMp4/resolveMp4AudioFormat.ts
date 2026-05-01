import type { AudioFormat } from "../../../types.js";

/**
 * Decide which {@link AudioFormat} to surface for a parsed MP4 file based on
 * the `ftyp` brand list.
 *
 * iTunes Audio (`M4A `) and Audio Books (`M4B `) map to `"m4a"` so callers
 * can distinguish audio-only containers; everything else (`isom`, `mp42`,
 * etc.) maps to `"mp4"`.
 *
 * @param brands - Brand strings extracted from `ftyp`.
 * @returns `"m4a"` for iTunes audio variants, `"mp4"` otherwise.
 */
export const resolveMp4AudioFormat = (brands: readonly string[]): AudioFormat => {
  const audioBrands = new Set(["M4A ", "M4B ", "M4P ", "M4V ", "M4VP", "M4VH"]);
  return brands.some((b) => audioBrands.has(b)) ? "m4a" : "mp4";
};
