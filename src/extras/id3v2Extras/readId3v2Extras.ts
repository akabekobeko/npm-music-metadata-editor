import type { Id3v2Tag } from "../../tags/id3v2/types.js";
import type { ChapterInfo, LyricsInfo, PictureInfo } from "../../types.js";
import { chapToChapter } from "../chapter/converters/chapToChapter.js";
import { buildChapterHierarchy, decodeCtoc } from "../chapter/converters/ctocToHierarchy.js";
import { syltToLyrics } from "../lyrics/converters/syltToLyrics.js";
import { usltToLyrics } from "../lyrics/converters/usltToLyrics.js";
import { apicToPicture } from "../picture/converters/apicToPicture.js";

/** Extras surfaced from an ID3v2 tag. */
export type Id3v2Extras = {
  /** Decoded `APIC` frames in tag order. */
  pictures: readonly PictureInfo[];
  /** Decoded chapters (assembled from `CHAP` / `CTOC` frames). */
  chapters: readonly ChapterInfo[];
  /** Decoded lyrics; synchronized when a `SYLT` was present, plain text otherwise. */
  lyrics: LyricsInfo | undefined;
};

/**
 * Project an {@link Id3v2Tag} onto the extras surfaces (pictures, chapters,
 * lyrics).
 *
 * Iterates the tag's frames once, dispatching by ID:
 * - `APIC` → {@link apicToPicture}
 * - `CHAP` → {@link chapToChapter} (CTOC frames are gathered separately to
 *   build the hierarchy)
 * - `USLT` → {@link usltToLyrics}; `SYLT` overrides any prior plain-text
 *   payload because synchronized data carries strictly more information.
 *
 * Frames the caller would surface differently (e.g. duplicate USLT) follow
 * a "first valid wins" policy, except for SYLT which always overrides USLT.
 *
 * @param tag - The parsed ID3v2 tag.
 * @returns The decoded extras.
 */
export const readId3v2Extras = (tag: Id3v2Tag): Id3v2Extras => {
  const pictures: PictureInfo[] = [];
  const chapters: ChapterInfo[] = [];
  const ctocs: ReturnType<typeof decodeCtoc>[] = [];
  let lyricsFromUslt: LyricsInfo | undefined;
  let lyricsFromSylt: LyricsInfo | undefined;

  for (const frame of tag.frames) {
    if (frame.id === "APIC" || frame.id === "PIC") {
      const picture = apicToPicture(frame.data);
      if (picture !== undefined) {
        pictures.push(picture);
      }

      continue;
    }

    if (frame.id === "CHAP") {
      const chapter = chapToChapter({ body: frame.data, majorVersion: tag.majorVersion });
      if (chapter !== undefined) {
        chapters.push(chapter);
      }

      continue;
    }

    if (frame.id === "CTOC") {
      const ctoc = decodeCtoc({ body: frame.data, majorVersion: tag.majorVersion });
      if (ctoc !== undefined) {
        ctocs.push(ctoc);
      }

      continue;
    }

    if (frame.id === "USLT" || frame.id === "ULT") {
      if (lyricsFromUslt === undefined) {
        lyricsFromUslt = usltToLyrics(frame.data);
      }

      continue;
    }

    if (frame.id === "SYLT" || frame.id === "SLT") {
      if (lyricsFromSylt === undefined) {
        lyricsFromSylt = syltToLyrics(frame.data);
      }
    }
  }

  const merged = mergeLyrics(lyricsFromUslt, lyricsFromSylt);
  const filteredCtocs = ctocs.filter((entry) => entry !== undefined);
  return {
    pictures,
    chapters: buildChapterHierarchy({ chapters, ctocs: filteredCtocs }),
    lyrics: merged,
  };
};

/**
 * Merge USLT and SYLT projections so the public {@link LyricsInfo} carries
 * both sources when the file ships them in parallel.
 *
 * The synchronized payload always wins on `synchronized`; the plain-text
 * `unsynchronized` falls back to the USLT body.
 *
 * @param uslt - Lyrics decoded from USLT (or `undefined` when none).
 * @param sylt - Lyrics decoded from SYLT (or `undefined` when none).
 * @returns A merged {@link LyricsInfo}, or `undefined` when neither source had content.
 */
const mergeLyrics = (
  uslt: LyricsInfo | undefined,
  sylt: LyricsInfo | undefined,
): LyricsInfo | undefined => {
  if (uslt === undefined && sylt === undefined) {
    return undefined;
  }

  if (sylt === undefined) {
    return uslt;
  }

  if (uslt === undefined) {
    return sylt;
  }

  return {
    language: sylt.language ?? uslt.language,
    description: sylt.description ?? uslt.description,
    unsynchronized: uslt.unsynchronized ?? sylt.unsynchronized,
    synchronized: sylt.synchronized,
  };
};
