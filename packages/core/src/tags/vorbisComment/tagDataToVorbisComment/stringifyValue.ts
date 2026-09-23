import type { TagData } from "../../../types.js";
import { encodePercentRating } from "../../../utils/rating/encodePercentRating.js";
import { hasTagValue } from "../../../utils/tagPatch/hasTagValue.js";

/**
 * Stringify a {@link TagPatch} value for emission as a Vorbis Comment / APE
 * text item.
 *
 * `rating` is rendered on the `0` .. `100` scale (see
 * {@link encodePercentRating}); every other field uses its plain string form.
 *
 * @param field - The `TagData` field the value belongs to.
 * @param value - The raw {@link TagPatch} value to render.
 * @returns A string representation, or `undefined` when the value should not
 *   be emitted (the field was left `undefined`, or set to `null` / `""` to
 *   clear it).
 */
export const stringifyValue = (
  field: keyof TagData,
  value: string | number | null | undefined,
): string | undefined => {
  if (!hasTagValue(value)) {
    return undefined;
  }

  return field === "rating" && typeof value === "number"
    ? encodePercentRating(value)
    : String(value);
};
