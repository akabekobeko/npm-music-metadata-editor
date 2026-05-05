import type { SyncedLine } from "./types.js";

/**
 * Format a millisecond offset as the canonical LRC time tag `[mm:ss.SSS]`.
 *
 * Negative inputs are clamped to 0 because LRC has no concept of negative
 * times; rounded to the nearest millisecond so a chain of
 * `parseLrc(formatLrc(...))` round-trips exactly.
 *
 * @param timeMs - Offset in milliseconds.
 * @returns A `[mm:ss.SSS]` tag.
 */
const formatTimeTag = (timeMs: number): string => {
  const total = Math.max(0, Math.round(timeMs));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1_000);
  const ms = total % 1_000;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const sss = String(ms).padStart(3, "0");
  return `[${mm}:${ss}.${sss}]`;
};

/**
 * Render an LRC document from synchronized lines and optional metadata.
 *
 * Metadata is emitted first (sorted by key for deterministic output), then
 * lines in `timeMs` ASC order. The output ends with a single trailing
 * newline so external editors do not flag the file as unterminated.
 *
 * @param lines - Synchronized lines to emit.
 * @param meta - Metadata key/value pairs (e.g. `{ ar: "Foo", ti: "Bar" }`).
 * @returns The serialized LRC document.
 */
export const formatLrc = (
  lines: readonly SyncedLine[],
  meta?: Readonly<Record<string, string>>,
): string => {
  const head =
    meta === undefined
      ? []
      : Object.entries(meta)
          .filter(([, value]) => value !== "")
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, value]) => `[${key}:${value}]`);
  const sorted = [...lines].sort((a, b) => a.timeMs - b.timeMs);
  const body = sorted.map((line) => `${formatTimeTag(line.timeMs)}${line.text}`);
  return `${[...head, ...body].join("\n")}\n`;
};
