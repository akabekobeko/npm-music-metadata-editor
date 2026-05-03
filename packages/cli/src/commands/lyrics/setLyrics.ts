import { type LyricsInfo, loadTrack, type SynchronizedLyric } from "@akabeko/music-metadata-editor";
import { CommanderError } from "commander";
import { saveModifiedTrack } from "../saveModifiedTrack.js";
import { type LyricsInputKind, loadLyricsInput } from "./loadLyricsInput.js";
import { parseLrc } from "./parseLrc.js";

/** Arguments accepted by {@link setLyrics}. */
type Args = {
  /** Source audio file. */
  readonly file: string;
  /** Discriminator selecting the input source flag. */
  readonly kind: LyricsInputKind;
  /** Path passed to the chosen flag (`-` reads from stdin). */
  readonly path: string;
  /** Optional `--language` override for the resulting `LyricsInfo`. */
  readonly language?: string;
  /** Optional `--description` override for the resulting `LyricsInfo`. */
  readonly description?: string;
  /** Stdin iterable used when `path === "-"`. */
  readonly stdin: AsyncIterable<Uint8Array>;
};

/** Outcome of running `setLyrics`. */
export type SetLyricsResult = {
  /** Stdout payload (always empty). */
  readonly stdout: string;
  /** Stderr payload (status / info lines). */
  readonly stderr: string;
};

/**
 * Throw a commander usage error so the bin layer maps it to exit code `2`.
 *
 * @param message - User-facing error message.
 * @returns Never; always throws.
 */
const usageError = (message: string): never => {
  throw new CommanderError(2, "mme.usageError", message);
};

/**
 * Validate and reshape a JSON document into a `LyricsInfo`.
 *
 * Performs minimal structural checks — the goal is to reject obviously
 * malformed input rather than re-implement the core's full schema. Numeric
 * coercion is intentionally absent so `--json '{"timeMs": "0"}'` is rejected
 * up front instead of silently coerced.
 *
 * @param raw - Raw JSON text.
 * @returns The validated `LyricsInfo`.
 */
const parseLyricsJson = (raw: string): LyricsInfo => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return usageError(`--json: invalid JSON (${(error as Error).message})`);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return usageError("--json: expected a JSON object");
  }

  const obj = parsed as Record<string, unknown>;
  const lyrics: LyricsInfo = {};
  if (obj.language !== undefined) {
    if (typeof obj.language !== "string") {
      return usageError("--json.language: expected a string");
    }

    lyrics.language = obj.language;
  }

  if (obj.description !== undefined) {
    if (typeof obj.description !== "string") {
      return usageError("--json.description: expected a string");
    }

    lyrics.description = obj.description;
  }

  if (obj.unsynchronized !== undefined) {
    if (typeof obj.unsynchronized !== "string") {
      return usageError("--json.unsynchronized: expected a string");
    }

    lyrics.unsynchronized = obj.unsynchronized;
  }

  if (obj.synchronized !== undefined) {
    if (!Array.isArray(obj.synchronized)) {
      return usageError("--json.synchronized: expected an array");
    }

    lyrics.synchronized = obj.synchronized.map((entry, i) => validateSyncEntry(entry, i));
  }

  return lyrics;
};

/**
 * Validate a single `--json.synchronized[i]` entry as a `SynchronizedLyric`.
 *
 * @param entry - Raw array element.
 * @param index - Position within the array (used in error messages).
 * @returns The validated entry.
 */
const validateSyncEntry = (entry: unknown, index: number): SynchronizedLyric => {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    return usageError(`--json.synchronized[${index}]: expected an object`);
  }

  const obj = entry as Record<string, unknown>;
  if (typeof obj.timeMs !== "number" || !Number.isFinite(obj.timeMs)) {
    return usageError(`--json.synchronized[${index}].timeMs: expected a finite number`);
  }

  if (typeof obj.text !== "string") {
    return usageError(`--json.synchronized[${index}].text: expected a string`);
  }

  return { timeMs: obj.timeMs, text: obj.text };
};

/**
 * Build a `LyricsInfo` from the input kind + content.
 *
 * - `text` → `{ unsynchronized: <body> }`.
 * - `lrc` → parse via {@link parseLrc} and capture both `synchronized` and a
 *   plain-text rendition (`text` line per entry) so callers consuming the
 *   `unsynchronized` field still see something coherent.
 * - `json` → validate the document into a `LyricsInfo`.
 *
 * @param kind - Input source flag.
 * @param body - Already-decoded body text.
 * @returns The constructed `LyricsInfo`.
 */
const lyricsFromBody = (kind: LyricsInputKind, body: string): LyricsInfo => {
  if (kind === "text") {
    return { unsynchronized: body };
  }

  if (kind === "lrc") {
    const synchronized = parseLrc(body);
    if (synchronized.length === 0) {
      return usageError("--lrc: no synchronized lyrics found in input");
    }

    return {
      synchronized,
      unsynchronized: synchronized.map((line) => line.text).join("\n"),
    };
  }

  return parseLyricsJson(body);
};

/**
 * Run `mme lyrics set <file>`.
 *
 * Builds a fresh `LyricsInfo` from the user-selected input source and
 * persists it via {@link saveModifiedTrack}. `--language` / `--description`
 * overlay onto the result so users can attach metadata to LRC payloads
 * without hand-editing them.
 *
 * @returns Buffered stdout / stderr payload.
 */
export const setLyrics = async (args: Args): Promise<SetLyricsResult> => {
  const body = await loadLyricsInput({ kind: args.kind, path: args.path, stdin: args.stdin });
  const base = lyricsFromBody(args.kind, body);
  const lyrics: LyricsInfo = {
    ...base,
    ...(args.language === undefined ? {} : { language: args.language }),
    ...(args.description === undefined ? {} : { description: args.description }),
  };

  const track = await loadTrack(args.file);
  await saveModifiedTrack(args.file, { ...track, lyrics });
  return { stdout: "", stderr: `[mme] wrote: ${args.file}\n` };
};
