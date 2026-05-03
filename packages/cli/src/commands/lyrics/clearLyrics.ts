import { loadTrack } from "@akabeko/music-metadata-editor";
import { saveModifiedTrack } from "../saveModifiedTrack.js";

/** Arguments accepted by {@link clearLyrics}. */
type Args = {
  /** Source audio file. */
  readonly file: string;
};

/** Outcome of running `clearLyrics`. */
export type ClearLyricsResult = {
  /** Stdout payload (always empty). */
  readonly stdout: string;
  /** Stderr payload (status / info lines). */
  readonly stderr: string;
};

/**
 * Run `mme lyrics clear <file>`.
 *
 * Replaces `track.lyrics` with an empty `LyricsInfo` (`{}`). The core
 * writers treat "lyrics is set" as the override signal and drop existing
 * lyrics frames; an empty body therefore translates to "no lyrics" without
 * leaving stale USLT / SYLT / Vorbis `LYRICS` entries behind.
 *
 * @returns Buffered stdout / stderr payload.
 */
export const clearLyrics = async (args: Args): Promise<ClearLyricsResult> => {
  const track = await loadTrack(args.file);
  await saveModifiedTrack(args.file, { ...track, lyrics: {} });
  return { stdout: "", stderr: `[mme] wrote: ${args.file}\n` };
};
