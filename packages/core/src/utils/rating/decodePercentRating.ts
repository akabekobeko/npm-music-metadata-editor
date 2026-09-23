/**
 * Decode a Vorbis Comment `RATING` / APE `Rating` text into a normalized
 * `[0, 1]` rating.
 *
 * Two conventions coexist in the wild, and the value range tells them apart
 * (same heuristic as ATL.NET):
 * - `0` .. `5` → a star count (possibly fractional, e.g. `"2.5"`), divided by 5.
 * - above `5` → a percentage on a `0` .. `100` scale, divided by 100 and
 *   clamped to `1`.
 *
 * @param text - Raw field text.
 * @returns The normalized rating, or `undefined` when the text is not a
 *   non-negative number.
 */
export const decodePercentRating = (text: string): number | undefined => {
  const value = Number.parseFloat(text.trim());
  if (!Number.isFinite(value) || value < 0) {
    return undefined;
  }

  if (value <= 5) {
    return value / 5;
  }

  return Math.min(value, 100) / 100;
};
