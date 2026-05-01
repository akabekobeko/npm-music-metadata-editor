import type { Id3v2Frame } from "../../tags/id3v2/types.js";
import { NO_FRAME_FLAGS } from "../../tags/id3v2/writeId3v2/constants.js";
import type { ChapterInfo, LyricsInfo, PictureInfo } from "../../types.js";
import { buildCtoc } from "../chapter/converters/buildCtoc.js";
import { chapterToChap } from "../chapter/converters/chapterToChap.js";
import { lyricsToSylt } from "../lyrics/converters/lyricsToSylt.js";
import { lyricsToUslt } from "../lyrics/converters/lyricsToUslt.js";
import { pictureToApic } from "../picture/converters/pictureToApic.js";

/** Frame IDs the writer fully manages when the caller supplies extras. */
export const EXTRA_FRAME_IDS: readonly string[] = [
  "APIC",
  "PIC",
  "CHAP",
  "CTOC",
  "USLT",
  "ULT",
  "SYLT",
  "SLT",
];

/** Arguments for {@link synthesizeExtraFrames}. */
type Args = {
  /** Pictures to emit as `APIC` frames. */
  pictures?: readonly PictureInfo[];
  /** Chapters to emit as `CHAP` (and one summary `CTOC`) frames. */
  chapters?: readonly ChapterInfo[];
  /** Lyrics to emit as `USLT` / `SYLT` frames. */
  lyrics?: LyricsInfo;
  /** Target ID3v2 major version (`3` or `4`). */
  majorVersion: 3 | 4;
};

/**
 * Translate the high-level extras (pictures / chapters / lyrics) into the
 * concrete ID3v2 frames they project to.
 *
 * The output is suitable to splice into the `frames` list passed to
 * {@link buildId3v2}: each entry is already a full {@link Id3v2Frame} with a
 * `NO_FRAME_FLAGS` flag set.
 *
 * Chapter handling follows the conventional flat-CTOC pattern: every chapter
 * lands as one `CHAP` frame and the writer emits a single top-level `CTOC`
 * with element ID `"toc"` referencing every chapter in order.
 *
 * @returns The synthesized frames in canonical emission order.
 */
export const synthesizeExtraFrames = ({
  pictures,
  chapters,
  lyrics,
  majorVersion,
}: Args): Id3v2Frame[] => {
  const out: Id3v2Frame[] = [];

  if (pictures !== undefined) {
    for (const picture of pictures) {
      out.push({
        id: "APIC",
        flags: NO_FRAME_FLAGS,
        data: pictureToApic({ picture }),
      });
    }
  }

  if (lyrics !== undefined) {
    const usltBody = lyricsToUslt({ lyrics });
    if (usltBody !== undefined) {
      out.push({ id: "USLT", flags: NO_FRAME_FLAGS, data: usltBody });
    }

    const syltBody = lyricsToSylt({ lyrics });
    if (syltBody !== undefined) {
      out.push({ id: "SYLT", flags: NO_FRAME_FLAGS, data: syltBody });
    }
  }

  if (chapters !== undefined) {
    appendChapterFrames({ chapters, majorVersion, out });
  }

  return out;
};

/** Arguments for {@link appendChapterFrames}. */
type ChapterArgs = {
  /** Chapters to encode (top-level only; sub-chapters are flattened in v0). */
  chapters: readonly ChapterInfo[];
  /** Target ID3v2 major version (`3` or `4`). */
  majorVersion: 3 | 4;
  /** Accumulator the synthesized frames are pushed onto. */
  out: Id3v2Frame[];
};

/**
 * Encode `chapters` as `CHAP` + a summary `CTOC` frame and append them to
 * `out`. When the chapters list is empty no frames are emitted.
 *
 * Sub-chapters, if any, are flattened into the top-level CTOC: the first
 * iteration of Phase 9 keeps a flat table of contents (matching ATL.NET's
 * convention) until ATL grows full hierarchical-CTOC support.
 */
const appendChapterFrames = ({ chapters, majorVersion, out }: ChapterArgs): void => {
  if (chapters.length === 0) {
    return;
  }

  const flattened = flattenChapters(chapters);
  for (const chapter of flattened) {
    out.push(chapterToChap({ chapter, majorVersion }));
  }

  out.push(
    buildCtoc({
      id: "toc",
      childElementIds: flattened.map((chapter) => chapter.id),
      isTopLevel: true,
      ordered: true,
      majorVersion,
    }),
  );
};

/** Flatten the chapter tree into a single list (depth-first, in declaration order). */
const flattenChapters = (chapters: readonly ChapterInfo[]): ChapterInfo[] => {
  const out: ChapterInfo[] = [];
  for (const chapter of chapters) {
    out.push(chapter);
    if (chapter.subChapters !== undefined && chapter.subChapters.length > 0) {
      out.push(...flattenChapters(chapter.subChapters));
    }
  }

  return out;
};
