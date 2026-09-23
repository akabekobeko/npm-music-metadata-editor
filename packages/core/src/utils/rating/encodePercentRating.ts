/**
 * Encode a normalized rating as the `0` .. `100` integer text used by the
 * Vorbis Comment `RATING` and APE `Rating` fields (MediaMonkey / MusicBee /
 * ATL.NET convention).
 *
 * @param rating - Rating in `[0, 1]`; values outside the range are clamped.
 * @returns The percentage as a decimal string (e.g. `"70"`).
 */
export const encodePercentRating = (rating: number): string =>
  String(Math.round(Math.max(0, Math.min(1, rating)) * 100));
