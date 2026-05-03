import type { LyricsInfo } from "../../types.js";

/**
 * Encode a {@link LyricsInfo} as an LRC-formatted string.
 *
 * The output starts with optional ID tags (`[la:eng]`, `[ti:Description]`),
 * followed by one timestamped line per synchronized entry. When `synchronized`
 * is empty, only the metadata block (and a trailing copy of `unsynchronized`,
 * when set) is emitted — that path is mainly useful for round-tripping a
 * lyrics record that originated from `parseLrc`.
 *
 * @param lyrics - Source lyrics structure.
 * @returns The LRC text. Always ends without a trailing newline so callers can
 *   decide whether to append one.
 */
export const formatLrc = (lyrics: LyricsInfo): string => {
  const lines: string[] = [];
  if (lyrics.language !== undefined && lyrics.language !== "") {
    lines.push(`[la:${lyrics.language}]`);
  }

  if (lyrics.description !== undefined && lyrics.description !== "") {
    lines.push(`[ti:${lyrics.description}]`);
  }

  const synchronized = lyrics.synchronized ?? [];
  if (synchronized.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }

    for (const line of synchronized) {
      lines.push(`[${formatTimestamp(line.timeMs)}]${line.text}`);
    }

    return lines.join("\n");
  }

  if (lyrics.unsynchronized !== undefined && lyrics.unsynchronized !== "") {
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push(lyrics.unsynchronized);
  }

  return lines.join("\n");
};

/**
 * Format a millisecond offset as `mm:ss.xx` (centisecond precision), matching
 * the LRC convention most commonly produced by encoders.
 *
 * @param totalMs - Time offset in milliseconds.
 * @returns The encoded `mm:ss.xx` string.
 */
const formatTimestamp = (totalMs: number): string => {
  const clamped = Math.max(0, Math.floor(totalMs));
  const minutes = Math.floor(clamped / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const centi = Math.floor((clamped % 1000) / 10);
  return `${pad2(minutes)}:${pad2(seconds)}.${pad2(centi)}`;
};

/** Left-pad a non-negative integer with `'0'` to width 2. */
const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));
