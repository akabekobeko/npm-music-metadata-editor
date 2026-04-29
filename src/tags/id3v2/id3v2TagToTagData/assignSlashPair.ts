import type { TagData } from "../../../types.js";

/** Arguments for {@link assignSlashPair}. */
type Args = {
  /** Mutated tag-data target. */
  target: TagData;
  /** Field receiving the leading number. */
  field: "trackNumber" | "discNumber";
  /** Source text (e.g. `"3"` or `"3/12"`). */
  text: string;
};

/**
 * Handle the `"3"` / `"3/12"` shorthand used by `TRCK` and `TPOS`.
 *
 * Splits on `/` and writes the leading number into `trackNumber` / `discNumber`,
 * the trailing number (when present) into `trackTotal` / `discTotal`.
 */
export const assignSlashPair = (args: Args): void => {
  const [head, tail] = args.text.split("/", 2);
  const headNum = Number.parseInt(head ?? "", 10);
  if (Number.isFinite(headNum)) {
    args.target[args.field] = headNum;
  }

  if (tail !== undefined) {
    const tailNum = Number.parseInt(tail, 10);
    if (Number.isFinite(tailNum)) {
      const totalField = args.field === "trackNumber" ? "trackTotal" : "discTotal";
      args.target[totalField] = tailNum;
    }
  }
};
