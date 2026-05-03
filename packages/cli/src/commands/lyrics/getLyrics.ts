import { type LyricsInfo, loadTrack } from "@akabeko/music-metadata-editor";
import { formatLrc } from "./formatLrc.js";

/** Output format accepted by `mme lyrics get --format <fmt>`. */
export type LyricsGetFormat = "text" | "lrc" | "json";

/** Arguments accepted by {@link getLyrics}. */
type Args = {
  /** Source audio file. */
  readonly file: string;
  /** Output format. */
  readonly format: LyricsGetFormat;
  /**
   * Optional ISO-639 language filter. The core currently returns at most
   * one `LyricsInfo`, so this is a forward-looking selector — it only takes
   * effect when the loaded `LyricsInfo.language` matches.
   */
  readonly language?: string;
};

/** Outcome of running `getLyrics`. */
export type GetLyricsResult = {
  /** Stdout payload (text / LRC / JSON). */
  readonly stdout: string;
  /** Stderr payload (status / info lines, empty by default). */
  readonly stderr: string;
};

/**
 * Decide whether the loaded lyrics block is usable given an optional
 * `--language` filter.
 *
 * Treats an absent `lyrics.language` as "matches anything" so files with
 * unlabelled lyrics still appear when the user supplies a language hint.
 *
 * @param lyrics - Lyrics from the loaded track (may be `undefined`).
 * @param language - Optional `--language` filter.
 * @returns `true` when the lyrics should be surfaced.
 */
const matchesLanguage = (lyrics: LyricsInfo | undefined, language: string | undefined): boolean => {
  if (lyrics === undefined) {
    return false;
  }

  if (language === undefined) {
    return true;
  }

  return lyrics.language === undefined || lyrics.language === language;
};

/**
 * Append a single trailing newline to `body` when it does not already end
 * with one, so terminal output is tidy without doubling up newlines on
 * payloads that already contain them (e.g. multi-line LRC bodies).
 *
 * @param body - Pre-rendered text payload.
 * @returns The newline-terminated payload.
 */
const ensureTrailingNewline = (body: string): string =>
  body === "" || body.endsWith("\n") ? body : `${body}\n`;

/**
 * Run `mme lyrics get <file>`.
 *
 * Renders the loaded `LyricsInfo` in the requested format. Throws when the
 * track has no lyrics (or the language filter excluded them) so the bin
 * layer translates the failure to exit code `1`. The error message
 * intentionally names the requested format to help users disambiguate
 * "no lyrics at all" from "no LRC lyrics specifically".
 *
 * @returns Buffered stdout / stderr payload.
 * @throws `Error` when no lyrics are available.
 */
export const getLyrics = async (args: Args): Promise<GetLyricsResult> => {
  const track = await loadTrack(args.file);
  const lyrics = matchesLanguage(track.lyrics, args.language) ? track.lyrics : undefined;
  if (lyrics === undefined) {
    const where = args.language === undefined ? "lyrics" : `lyrics (language=${args.language})`;
    throw new Error(`no ${where} found in "${args.file}"`);
  }

  if (args.format === "json") {
    return { stdout: `${JSON.stringify(lyrics, null, 2)}\n`, stderr: "" };
  }

  if (args.format === "lrc") {
    const text = formatLrc(lyrics.synchronized ?? []);
    if (text === "") {
      throw new Error(`no synchronized lyrics in "${args.file}"`);
    }

    return { stdout: ensureTrailingNewline(text), stderr: "" };
  }

  const text = lyrics.unsynchronized;
  if (text === undefined || text === "") {
    throw new Error(`no unsynchronized lyrics in "${args.file}"`);
  }

  return { stdout: ensureTrailingNewline(text), stderr: "" };
};
