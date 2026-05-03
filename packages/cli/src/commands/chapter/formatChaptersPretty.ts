import type { ChapterInfo } from "@akabeko/music-metadata-editor";

/** Header column labels for the pretty table. */
const HEADERS = ["#", "start", "end", "title"] as const;

/**
 * Left-pad a non-negative integer with `'0'` to width 2.
 *
 * @param n - Non-negative integer.
 * @returns Two-character zero-padded string.
 */
const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/**
 * Render a millisecond offset as `HH:MM:SS`.
 *
 * Sub-second precision is intentionally dropped — the pretty output is
 * meant for at-a-glance scanning, not millisecond-perfect inspection. Tools
 * that need raw `startMs` / `endMs` should consume the JSON form instead.
 *
 * @param ms - Millisecond offset.
 * @returns Zero-padded `HH:MM:SS` string.
 */
const formatTime = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
};

/**
 * Pad `value` to `width` columns with trailing spaces.
 *
 * Used for the rightmost (title) column so the divider row keeps its shape
 * even when titles are short.
 *
 * @param value - Cell value.
 * @param width - Target column width in characters.
 * @returns The padded string.
 */
const padRight = (value: string, width: number): string =>
  value.length >= width ? value : value + " ".repeat(width - value.length);

/**
 * Pad `value` to `width` columns with leading spaces.
 *
 * Used for the index column so single-digit indices align with double-digit
 * ones when the chapter count crosses 10.
 *
 * @param value - Cell value.
 * @param width - Target column width in characters.
 * @returns The padded string.
 */
const padLeft = (value: string, width: number): string =>
  value.length >= width ? value : " ".repeat(width - value.length) + value;

/**
 * Render a chapter list as a human-readable table.
 *
 * Output shape:
 *
 * ```
 * #  | start    | end      | title
 * -- | -------- | -------- | --------------------
 *  0 | 00:00:00 | 00:01:23 | Intro
 * ```
 *
 * Empty input still emits the header so callers can pipe through column
 * tools (`column -t -s '|'`) without special-casing the empty case. The
 * trailing newline is included so `process.stdout.write(...)` produces a
 * tidy terminal.
 *
 * @param chapters - Chapters to render.
 * @returns The rendered table.
 */
export const formatChaptersPretty = (chapters: readonly ChapterInfo[]): string => {
  const indexWidth = Math.max(HEADERS[0].length, String(chapters.length - 1).length);
  const titleWidth = Math.max(HEADERS[3].length, ...chapters.map((c) => (c.title ?? "").length));
  const headerRow = `${padLeft(HEADERS[0], indexWidth)} | ${padRight(HEADERS[1], 8)} | ${padRight(HEADERS[2], 8)} | ${padRight(HEADERS[3], titleWidth)}`;
  const dividerRow = `${"-".repeat(indexWidth)} | ${"-".repeat(8)} | ${"-".repeat(8)} | ${"-".repeat(titleWidth)}`;
  const dataRows = chapters.map((c, i) => {
    const idx = padLeft(String(i), indexWidth);
    const title = padRight(c.title ?? "", titleWidth);
    return `${idx} | ${formatTime(c.startMs)} | ${formatTime(c.endMs)} | ${title}`;
  });
  return `${[headerRow, dividerRow, ...dataRows].join("\n")}\n`;
};
