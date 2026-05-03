import { findApeTagOffset } from "../../../tags/ape/readApeTag/findApeTagOffset.js";
import { ID3V1_TAG_SIZE } from "../../../tags/id3v1/constants.js";
import { readId3v1 } from "../../../tags/id3v1/readId3v1/readId3v1.js";

/**
 * Compute the byte offset just past the end of the audio data.
 *
 * The trailer can layer up to three tags: `[audio][APE?][ID3v1?]`. The audio
 * ends at whichever tag comes first — checked APE Tag first because the
 * locator already accounts for an outer ID3v1 trailer.
 *
 * @param input - Whole-file MP3 bytes.
 * @returns Offset to the byte right after the audio payload.
 */
export const findMp3AudioEnd = (input: Uint8Array): number => {
  const ape = findApeTagOffset(input);
  if (ape !== undefined) {
    return ape.tagStart;
  }

  const id3v1 = readId3v1(input);
  return id3v1 === undefined ? input.length : input.length - ID3V1_TAG_SIZE;
};
