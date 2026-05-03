import type { SynchronizedLyric } from "@akabeko/music-metadata-editor";

/**
 * Left-pad a non-negative integer with `'0'` to width 2.
 *
 * @param n - Non-negative integer.
 * @returns Two-character zero-padded string.
 */
const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/**
 * Render a millisecond offset as `mm:ss.xx` (centisecond precision), the
 * format most LRC encoders emit.
 *
 * Matches `parseLrc`'s acceptance: feeding `formatLrc` output back into
 * `parseLrc` is a stable round-trip for any value the CLI produces.
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

/**
 * Encode a list of synchronized lyrics as LRC text.
 *
 * Each entry produces one `[mm:ss.xx]text` line; lines are joined with `\n`
 * and the result has no trailing newline so callers can decide whether to
 * append one (terminal output usually wants one; files written through
 * `writeFile` are usually fine without).
 *
 * @param lyrics - Synchronized lyric lines.
 * @returns The LRC text (empty string when `lyrics` is empty).
 */
export const formatLrc = (lyrics: readonly SynchronizedLyric[]): string =>
  lyrics.map((line) => `[${formatTimestamp(line.timeMs)}]${line.text}`).join("\n");
