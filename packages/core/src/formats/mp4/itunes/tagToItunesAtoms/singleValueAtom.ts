import type { ItunesAtom, ItunesDataValue } from "../../types.js";

/**
 * Build a single-value {@link ItunesAtom} for a given (name, value) pair.
 *
 * @param name - 4-character atom code.
 * @param value - The data value to attach.
 * @returns The constructed atom.
 */
export const singleValueAtom = (name: string, value: ItunesDataValue): ItunesAtom => ({
  name,
  values: [value],
});
