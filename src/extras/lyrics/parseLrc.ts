import type { LyricsInfo, SynchronizedLyric } from "../../types.js";

/**
 * Pattern matching one LRC timestamp tag (`[mm:ss.ms]` or `[mm:ss]`). The
 * optional fractional component covers both 2-digit (centiseconds) and 3-digit
 * (milliseconds) precision used in the wild.
 */
const TIMESTAMP_RE = /^\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?]/;

/**
 * Pattern for ID-tag lines (`[ar:Artist]`, `[al:Album]`, `[length:03:24]`, ...).
 * The body must not start with a digit (to disambiguate from timestamp lines).
 */
const ID_TAG_RE = /^\[([a-zA-Z][\w-]*):([^\]]*)]\s*$/;

/**
 * Parse an LRC file body into a {@link LyricsInfo}.
 *
 * Recognised constructs:
 * - ID tags: `[ar:Artist]`, `[al:Album]`, `[ti:Title]`, `[la:Language]`, ...
 *   Only `la` / `lang` (language) and `ti` (description fallback) influence
 *   the result; the rest are dropped because they map to other `TagData`
 *   fields that the caller already handles.
 * - One or more timestamps prefixing a single text line (`[mm:ss.xx][mm:ss.xx]Text`).
 *   Each timestamp produces its own {@link SynchronizedLyric}.
 *
 * Lines without a recognised tag are ignored. The synchronized list is sorted
 * by `timeMs` ascending. When at least one timestamp parses, the original LRC
 * source is also surfaced as `unsynchronized` so callers that prefer the raw
 * form can still reach it.
 *
 * @param source - LRC text. Line endings can be either `\n` or `\r\n`.
 * @returns A {@link LyricsInfo}; the `synchronized` field is empty when the
 *   input contained no recognisable timestamps.
 */
export const parseLrc = (source: string): LyricsInfo => {
  const synchronized: SynchronizedLyric[] = [];
  let language: string | undefined;
  let description: string | undefined;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") {
      continue;
    }

    const idTagMatch = ID_TAG_RE.exec(line);
    if (idTagMatch !== null) {
      const key = (idTagMatch[1] ?? "").toLowerCase();
      const value = (idTagMatch[2] ?? "").trim();
      if ((key === "la" || key === "lang") && language === undefined) {
        language = value;
      } else if (key === "ti" && description === undefined) {
        description = value;
      }

      continue;
    }

    const consumed = consumeTimestamps(line);
    if (consumed === undefined) {
      continue;
    }

    for (const timeMs of consumed.times) {
      synchronized.push({ timeMs, text: consumed.text });
    }
  }

  synchronized.sort((a, b) => a.timeMs - b.timeMs);

  const lyrics: LyricsInfo = {};
  if (language !== undefined) {
    lyrics.language = language;
  }

  if (description !== undefined) {
    lyrics.description = description;
  }

  if (synchronized.length > 0) {
    lyrics.synchronized = synchronized;
    lyrics.unsynchronized = source;
  } else {
    lyrics.unsynchronized = source;
  }

  return lyrics;
};

/**
 * Pull every timestamp prefix off the start of `line`, returning the
 * accumulated millisecond offsets and the remaining lyric text.
 *
 * @param line - One trimmed LRC line.
 * @returns The decoded timestamps + lyric text, or `undefined` when the line
 *   carried no leading timestamp.
 */
const consumeTimestamps = (line: string): { times: number[]; text: string } | undefined => {
  const times: number[] = [];
  let cursor = 0;
  while (cursor < line.length) {
    const remainder = line.slice(cursor);
    const match = TIMESTAMP_RE.exec(remainder);
    if (match === null) {
      break;
    }

    const minutes = Number.parseInt(match[1] ?? "0", 10);
    const seconds = Number.parseInt(match[2] ?? "0", 10);
    const fraction = match[3] ?? "";
    times.push(toMs({ minutes, seconds, fraction }));
    cursor += match[0].length;
  }

  if (times.length === 0) {
    return undefined;
  }

  return { times, text: line.slice(cursor).trim() };
};

/** Arguments for {@link toMs}. */
type ToMsArgs = {
  /** Minutes component. */
  minutes: number;
  /** Seconds component. */
  seconds: number;
  /** Sub-second fraction string (1–3 digits, possibly empty). */
  fraction: string;
};

/** Combine minutes + seconds + sub-second fraction into a millisecond count. */
const toMs = ({ minutes, seconds, fraction }: ToMsArgs): number => {
  const baseMs = minutes * 60_000 + seconds * 1000;
  if (fraction === "") {
    return baseMs;
  }

  // 2-digit fractions are centiseconds; 3-digit fractions are milliseconds. Pad
  // shorter values so `"4"` becomes `400` ms (one tenth of a second).
  const padded = `${fraction}000`.slice(0, 3);
  return baseMs + Number.parseInt(padded, 10);
};
