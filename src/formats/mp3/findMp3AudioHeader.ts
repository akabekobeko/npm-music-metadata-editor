import { parseMp3AudioHeader } from "./parseMp3AudioHeader.js";

/** Arguments for {@link findMp3AudioHeader}. */
export type FindMp3AudioHeaderArgs = {
  /** Source bytes to scan. */
  bytes: Uint8Array;
  /** Offset to start scanning from. */
  startOffset: number;
  /**
   * Maximum number of bytes to scan from `startOffset`. Defaults to 64 KiB,
   * which comfortably covers a typical ID3v2 tag plus any leading padding.
   */
  maxScan?: number;
};

/**
 * Locate the first valid MPEG audio frame header starting at `startOffset`.
 *
 * Scans forward up to `maxScan` bytes looking for `0xFF 0xEx`/`0xFx` followed
 * by a parseable header.
 *
 * @returns The offset where the header begins, or `-1` when no header is found.
 */
export const findMp3AudioHeader = (args: FindMp3AudioHeaderArgs): number => {
  const { bytes, startOffset } = args;
  const maxScan = args.maxScan ?? 0x10000;
  const end = Math.min(bytes.length - 4, startOffset + maxScan);
  for (let i = startOffset; i <= end; i += 1) {
    if (bytes[i] !== 0xff) {
      continue;
    }

    if (parseMp3AudioHeader(bytes, i) !== undefined) {
      return i;
    }
  }

  return -1;
};
