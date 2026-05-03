import { ID3V1_GENRES } from "./constants.js";

/**
 * Resolve a `gnre` index (1-based) to the matching ID3v1 genre name.
 *
 * @param index - 1-based ID3v1 genre index.
 * @returns The genre string, or `undefined` when the index is out of range.
 */
export const resolveGnreIndex = (index: number): string | undefined => {
  const zeroBased = index - 1;
  if (zeroBased < 0 || zeroBased >= ID3V1_GENRES.length) {
    return undefined;
  }

  return ID3V1_GENRES[zeroBased];
};
