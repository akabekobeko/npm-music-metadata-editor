import { parseId3v2 } from "../../../tags/id3v2/parseId3v2/parseId3v2.js";

/**
 * Compute the byte offset of the first MPEG audio frame in `input`.
 *
 * Used by the writer to know where the audio payload starts so the new ID3v2
 * tag can be spliced in front of it. Returns `0` when no leading ID3v2 is
 * present, or the parsed tag's total size otherwise.
 */
export const findMp3AudioStart = (input: Uint8Array): number => {
  const id3v2 = parseId3v2(input);
  if (id3v2 === undefined) {
    return 0;
  }

  return id3v2.totalSize;
};
