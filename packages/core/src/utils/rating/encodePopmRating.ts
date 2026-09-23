/**
 * POPM byte for each half-star step (index = stars × 2, i.e. `0` .. `10`).
 *
 * De facto convention shared by Windows Explorer / Windows Media Player,
 * MediaMonkey and MusicBee (also what ATL.NET emits): whole stars map to
 * `1 / 64 / 128 / 196 / 255` and half stars fill the gaps.
 */
const HALF_STAR_TO_POPM: readonly number[] = [0, 13, 1, 54, 64, 118, 128, 186, 196, 242, 255];

/**
 * Encode a normalized rating as an ID3v2 `POPM` rating byte.
 *
 * The rating is snapped to the nearest half star (`0.1` steps of the
 * normalized scale) and looked up in the conventional table, so a value
 * written here reads back through {@link decodePopmRating} unchanged.
 *
 * @param rating - Rating in `[0, 1]`; values outside the range are clamped.
 * @returns The `POPM` rating byte (`0` .. `255`).
 */
export const encodePopmRating = (rating: number): number => {
  const clamped = Math.max(0, Math.min(1, rating));
  return HALF_STAR_TO_POPM[Math.round(clamped * 10)] ?? 0;
};
