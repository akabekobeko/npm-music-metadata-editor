/**
 * Decode an ID3v2 `POPM` rating byte into a normalized `[0, 1]` rating.
 *
 * Follows the ATL.NET interpretation of the de facto conventions:
 * - `0` → unrated (`0`).
 * - `1` .. `5` → a star count on a 5-star scale (`1` is the conventional
 *   Windows value for one star).
 * - `6` .. `10` → a 0..10 scale.
 * - `11` .. `255` → the Windows / MediaMonkey / MusicBee popularity table,
 *   where each range snaps to the nearest half star (`13` → half a star,
 *   `54` → 1.5 stars, `64` → 2 stars, ... `255` → 5 stars).
 *
 * @param value - Raw rating byte (`0` .. `255`).
 * @returns The normalized rating.
 */
export const decodePopmRating = (value: number): number => {
  if (value <= 0) return 0;
  if (value <= 5) return value / 5;
  if (value <= 10) return value / 10;
  if (value < 54) return 0.1;
  if (value < 64) return 0.3;
  if (value < 118) return 0.4;
  if (value < 128) return 0.5;
  if (value < 186) return 0.6;
  if (value < 196) return 0.7;
  if (value < 242) return 0.8;
  if (value < 255) return 0.9;
  return 1;
};
