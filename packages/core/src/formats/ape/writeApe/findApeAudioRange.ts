import { findApeTagOffset } from "../../../tags/ape/readApeTag/findApeTagOffset.js";

/**
 * Boundary describing where the Monkey's Audio audio payload sits in a file.
 *
 * Monkey's Audio places metadata at the end of the file, so the audio always
 * starts at offset `0` and ends just before the trailing APE Tag (when one
 * exists). The writer copies `[0, audioEnd)` verbatim and appends a freshly
 * built tag.
 */
export type ApeAudioRange = {
  /** Offset just past the last audio byte (start of the trailing tag, or end of file). */
  audioEnd: number;
};

/**
 * Compute the audio range for a Monkey's Audio file.
 *
 * @param input - Whole-file bytes.
 * @returns The range to copy verbatim when rewriting metadata.
 */
export const findApeAudioRange = (input: Uint8Array): ApeAudioRange => {
  const apeLocation = findApeTagOffset(input);
  if (apeLocation === undefined) {
    return { audioEnd: input.length };
  }

  return { audioEnd: apeLocation.tagStart };
};
