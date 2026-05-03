import type { SynchronizedLyric } from "@akabeko/music-metadata-editor";

/**
 * Pattern for one LRC timestamp prefix: `[mm:ss]`, `[mm:ss.xx]` or
 * `[mm:ss.xxx]`. Both `.` and `:` are accepted as the seconds / fraction
 * separator (encoder dialect varies in the wild).
 */
const TIMESTAMP_RE = /^\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?]/;

/**
 * Pattern for an LRC ID-tag line such as `[ar:Artist]` / `[la:eng]`. The
 * leading character of the body must not be a digit, which is what
 * disambiguates it from a timestamp line.
 */
const ID_TAG_RE = /^\[[a-zA-Z]/;

/** Decoded prefix of a single LRC line. */
type ConsumedLine = {
  /** Millisecond offsets parsed from the leading timestamp tags. */
  readonly times: readonly number[];
  /** Lyric text remaining after every timestamp prefix has been stripped. */
  readonly text: string;
};

/** Inputs to {@link timestampToMs}. */
type TimestampParts = {
  /** Minutes component (`mm`). */
  readonly minutes: number;
  /** Seconds component (`ss`). */
  readonly seconds: number;
  /** Sub-second fraction string (1–3 digits, possibly empty). */
  readonly fraction: string;
};

/**
 * Combine the matched components of an LRC timestamp into a millisecond
 * offset.
 *
 * Two- and three-digit fractions are both legal in the wild: a 2-digit
 * fraction is centiseconds (so `[00:01.50]` → 1500 ms), a 3-digit fraction is
 * milliseconds (so `[00:01.500]` → 1500 ms). Single-digit fractions are
 * padded as if they were 3-digit milliseconds with trailing zeros (`.4` →
 * 400 ms), matching how most encoders interpret terse input.
 *
 * @returns The offset in milliseconds.
 */
const timestampToMs = ({ minutes, seconds, fraction }: TimestampParts): number => {
  const baseMs = minutes * 60_000 + seconds * 1000;
  if (fraction === "") {
    return baseMs;
  }

  const padded = `${fraction}000`.slice(0, 3);
  return baseMs + Number.parseInt(padded, 10);
};

/**
 * Pull every timestamp prefix off the start of `line` and return the
 * accumulated offsets together with the remaining lyric text.
 *
 * Returns `undefined` when the line carried no leading timestamp at all,
 * letting the caller skip non-timestamped lines (continuation text, comments
 * inserted by some editors, ...).
 *
 * @param line - One trimmed LRC line.
 * @returns The decoded timestamps + lyric text, or `undefined` when the line
 *   is not a timestamped lyric.
 */
const consumeTimestamps = (line: string): ConsumedLine | undefined => {
  const times: number[] = [];
  let cursor = 0;
  while (cursor < line.length) {
    const match = TIMESTAMP_RE.exec(line.slice(cursor));
    if (match === null) {
      break;
    }

    times.push(
      timestampToMs({
        minutes: Number.parseInt(match[1] ?? "0", 10),
        seconds: Number.parseInt(match[2] ?? "0", 10),
        fraction: match[3] ?? "",
      }),
    );
    cursor += match[0].length;
  }

  if (times.length === 0) {
    return undefined;
  }

  return { times, text: line.slice(cursor).trim() };
};

/**
 * Parse an LRC body into a flat list of {@link SynchronizedLyric} records.
 *
 * Behaviour notes:
 *
 * - Each `[mm:ss.xx]` timestamp prefix produces one entry; a line carrying
 *   multiple prefixes (`[00:01.00][00:05.00]Repeat me`) yields one entry
 *   per timestamp.
 * - ID-tag lines (`[ar:Artist]`, `[la:eng]`, ...) are ignored — those map
 *   to other `LyricsInfo` fields that the caller handles via `--language`
 *   / `--description`.
 * - Lines without a leading timestamp are dropped.
 * - The result is sorted by `timeMs` ascending so writer output stays
 *   deterministic regardless of input order.
 *
 * @param source - LRC text. Line endings can be `\n` or `\r\n`.
 * @returns The decoded synchronized lyrics; empty when nothing parsed.
 */
export const parseLrc = (source: string): readonly SynchronizedLyric[] => {
  const result: SynchronizedLyric[] = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || ID_TAG_RE.test(line)) {
      continue;
    }

    const consumed = consumeTimestamps(line);
    if (consumed === undefined) {
      continue;
    }

    consumed.times.forEach((timeMs) => {
      result.push({ timeMs, text: consumed.text });
    });
  }

  result.sort((a, b) => a.timeMs - b.timeMs);
  return result;
};
