import { loadTrack } from "@akabeko/music-metadata-editor";
import { saveModifiedTrack } from "../saveModifiedTrack.js";

/** Arguments accepted by {@link clearChapter}. */
type Args = {
  /** Source audio file. */
  readonly file: string;
};

/** Outcome of running `clearChapter`. */
export type ClearChapterResult = {
  /** Stdout payload (always empty). */
  readonly stdout: string;
  /** Stderr payload (status / info lines). */
  readonly stderr: string;
};

/**
 * Run `mme chapter clear <file>`.
 *
 * Empties `track.chapters` and writes the result back via
 * {@link saveModifiedTrack}.
 *
 * @returns Buffered stdout / stderr payload.
 */
export const clearChapter = async (args: Args): Promise<ClearChapterResult> => {
  const track = await loadTrack(args.file);
  await saveModifiedTrack(args.file, { ...track, chapters: [] });
  return { stdout: "", stderr: `[mme] wrote: ${args.file}\n` };
};
