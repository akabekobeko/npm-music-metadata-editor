import type { ParsedLrc, SyncedLine } from "./types.js";

/** LRC time-tag pattern: `[mm:ss]` or `[mm:ss.SSS]` / `[mm:ss.ff]`. */
const TIME_TAG = /\[(\d{1,3}):([0-5]\d)(?:[.:](\d{1,3}))?\]/g;

/** LRC metadata-tag pattern: `[key:value]` where `key` is non-numeric. */
const META_TAG = /^\[([a-zA-Z][a-zA-Z0-9_-]*):([^\]]*)\]$/;

/**
 * Convert a fractional component (`"5"`, `"50"`, `"500"`) into milliseconds.
 *
 * LRC fractions can be 1-3 digits; 1 digit is treated as tenths, 2 as
 * centiseconds, 3 as milliseconds. Anything longer is truncated to the first
 * 3 digits — a defensive measure for malformed inputs.
 *
 * @param fraction - Raw digit substring captured from the time tag.
 * @returns The fraction expressed in milliseconds (0-999).
 */
const fractionToMs = (fraction: string): number => {
  const padded = `${fraction}000`.slice(0, 3);
  return Number.parseInt(padded, 10);
};

/**
 * Parse a single line and accumulate any time-tag prefixed lyrics.
 *
 * Multiple time tags can prefix the same line (`[00:01.00][00:30.00]Foo`),
 * each yielding a separate {@link SyncedLine}. Lines without a tag and lines
 * starting with `#` are skipped silently.
 *
 * @param line - Raw line from the source document.
 * @returns Zero or more synchronized lines extracted from `line`.
 */
const parseLyricLine = (line: string): readonly SyncedLine[] => {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) {
    return [];
  }

  const tags: number[] = [];
  let lastIndex = 0;
  TIME_TAG.lastIndex = 0;
  while (true) {
    const match = TIME_TAG.exec(trimmed);
    if (match === null || match.index !== lastIndex) {
      break;
    }

    const minutes = Number.parseInt(match[1] ?? "0", 10);
    const seconds = Number.parseInt(match[2] ?? "0", 10);
    const fraction = match[3] ?? "";
    const ms = minutes * 60_000 + seconds * 1_000 + (fraction === "" ? 0 : fractionToMs(fraction));
    tags.push(ms);
    lastIndex = TIME_TAG.lastIndex;
  }

  if (tags.length === 0) {
    return [];
  }

  const text = trimmed.slice(lastIndex);
  return tags.map((timeMs) => ({ timeMs, text }));
};

/**
 * Parse an LRC document into synchronized lines plus metadata tags.
 *
 * The parser handles only the standard subset (`[mm:ss.SSS]Text` plus
 * `[key:value]` metadata). Enhanced LRC word-level timing (`<00:01.00>`) is
 * preserved as part of the text body — extracting per-word timestamps is out
 * of scope for v1.
 *
 * Lines whose time tag is structurally invalid (e.g. seconds out of `[0,59]`)
 * are dropped silently; the caller never sees a partial / truncated line.
 *
 * @param text - Raw LRC document.
 * @returns Sorted lines plus a metadata bag keyed by lower-cased tag name.
 */
export const parseLrc = (text: string): ParsedLrc => {
  const meta: Record<string, string> = {};
  const lines: SyncedLine[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const metaMatch = META_TAG.exec(trimmed);
    if (metaMatch !== null) {
      const key = (metaMatch[1] ?? "").toLowerCase();
      const value = metaMatch[2] ?? "";
      meta[key] = value;
      continue;
    }

    for (const parsed of parseLyricLine(trimmed)) {
      lines.push(parsed);
    }
  }

  lines.sort((a, b) => a.timeMs - b.timeMs);
  return { lines, meta };
};
