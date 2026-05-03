import { loadTrack } from "@akabeko/music-metadata-editor";
import { formatChaptersPretty } from "./formatChaptersPretty.js";

/** Arguments accepted by {@link listChapter}. */
type Args = {
  /** Source audio file. */
  readonly file: string;
  /** When `true`, render the human-readable table; otherwise emit JSON. */
  readonly pretty: boolean;
};

/** Outcome of running `listChapter`. */
export type ListChapterResult = {
  /** Stdout payload (JSON or pretty table). */
  readonly stdout: string;
  /** Stderr payload (always empty for now). */
  readonly stderr: string;
};

/**
 * Run `mme chapter list <file>`.
 *
 * Loads the track, then renders `track.chapters` as either a JSON array
 * (default) or the pretty table from {@link formatChaptersPretty}. JSON
 * uses 2-space indentation to match the rest of the CLI output.
 *
 * @returns Buffered stdout / stderr payload.
 */
export const listChapter = async (args: Args): Promise<ListChapterResult> => {
  const track = await loadTrack(args.file);
  if (args.pretty) {
    return { stdout: formatChaptersPretty(track.chapters), stderr: "" };
  }

  return { stdout: `${JSON.stringify(track.chapters, null, 2)}\n`, stderr: "" };
};
