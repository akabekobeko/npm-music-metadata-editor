import { ID3V2_MAGIC } from "../../tags/id3v2/constants.js";
import { parseMp3AudioHeader } from "./parseMp3AudioHeader.js";

/**
 * Return `true` when `header` looks like the start of an MP3 file.
 *
 * Accepts either a leading ID3v2 tag (`"ID3"` magic) or an MPEG audio sync at
 * offset 0. The sync is intentionally *not* searched for beyond offset 0: an
 * MPEG frame header is only ~2 bytes of effective magic, and scanning a wider
 * window makes arbitrary binary data (e.g. an MP4 `mvhd` timestamp containing
 * `0xFF Ex/Fx`) match as MP3. Files with leading junk before the first frame
 * are still resolved via the `.mp3` extension fallback in `detectFormat`.
 *
 * @param header - Leading bytes of the file (typically up to 64 bytes).
 * @returns `true` on a match, `false` otherwise.
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

  return parseMp3AudioHeader(header, 0) !== undefined;
};
