/**
 * Clamp a track number into the single byte ID3v1.1 reserves for it.
 *
 * @param trackNumber - Desired track number, or `undefined` for "no track".
 * @returns A byte in `[0, 255]`. `0` represents "no track".
 */
export const clampTrack = (trackNumber: number | undefined): number => {
  if (trackNumber === undefined || trackNumber < 1) {
    return 0;
  }

  return trackNumber > 0xff ? 0xff : Math.floor(trackNumber);
};
