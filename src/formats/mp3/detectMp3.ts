import { ID3V2_MAGIC } from "../../tags/id3v2/constants.js";
import { findMp3AudioHeader } from "./audioHeader.js";

/**
 * Return `true` when `header` looks like the start of an MP3 file.
 *
 * Accepts either a leading ID3v2 tag (`"ID3"` magic) or a direct MPEG audio
 * sync within the first 64 bytes (the same window other detectors use).
 *
 * @param header - Leading bytes of the file (typically up to 64 bytes).
 */
export const detectMp3Signature = (header: Uint8Array): boolean => {
  if (
    header.length >= 3 &&
    header[0] === ID3V2_MAGIC[0] &&
    header[1] === ID3V2_MAGIC[1] &&
    header[2] === ID3V2_MAGIC[2]
  ) {
    return true;
  }

  return findMp3AudioHeader({ bytes: header, startOffset: 0, maxScan: header.length }) !== -1;
};
