import { hasTagValue } from "../../../utils/tagPatch/hasTagValue.js";

/**
 * Stringify a {@link TagPatch} value for emission as a Vorbis Comment.
 *
 * @param value - The raw {@link TagPatch} value to render.
 * @returns A string representation, or `undefined` when the value should not
 *   be emitted (the field was left `undefined`, or set to `null` / `""` to
 *   clear it).
 */
export const stringifyValue = (value: string | number | null | undefined): string | undefined =>
  hasTagValue(value) ? String(value) : undefined;
