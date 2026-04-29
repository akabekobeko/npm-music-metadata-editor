import { ID3V1_TAG_SIZE } from "../../../tags/id3v1/constants.js";
import { readId3v1 } from "../../../tags/id3v1/readId3v1/readId3v1.js";

/**
 * Compute the byte offset just past the end of the audio data, i.e. the start
 * of the trailing ID3v1 tag (when present) or the file end.
 *
 * @param input - Whole-file MP3 bytes.
 * @returns Offset to the byte right after the audio payload.
 */
export const findMp3AudioEnd = (input: Uint8Array): number => {
  const id3v1 = readId3v1(input);
  return id3v1 === undefined ? input.length : input.length - ID3V1_TAG_SIZE;
};
