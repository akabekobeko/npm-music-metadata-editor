import type { TagData } from "../../../types.js";

/** Arguments for {@link assignSlashPair}. */
type Args = {
  /** Tag data object the parsed components are written into (mutated). */
  target: TagData;
  /** Source text in either `"N"` or `"N/Total"` form. */
  text: string;
  /** Field that receives the numerator. */
  numberField: keyof TagData;
  /** Field that receives the denominator (when present). */
  totalField: keyof TagData;
};

/**
 * Parse a free-form `"X"` or `"X/Y"` numeric string and assign the components
 * to `numberField` / `totalField` on `target`.
 */
export const assignSlashPair = ({ target, text, numberField, totalField }: Args): void => {
  const [numberPart, totalPart] = text.split("/");
  const num = Number.parseInt(numberPart ?? "", 10);
  if (Number.isFinite(num)) {
    (target as Record<string, unknown>)[numberField] = num;
  }

  if (totalPart !== undefined) {
    const total = Number.parseInt(totalPart, 10);
    if (Number.isFinite(total)) {
      (target as Record<string, unknown>)[totalField] = total;
    }
  }
};
