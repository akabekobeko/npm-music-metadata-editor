import { Buffer } from "node:buffer";
import {
  EXTRA_FRAME_IDS,
  synthesizeExtraFrames,
} from "../../../extras/id3v2Extras/synthesizeExtraFrames.js";
import { parseId3v2 } from "../../../tags/id3v2/parseId3v2/parseId3v2.js";
import type { Id3v2Frame, Id3v2MajorVersion } from "../../../tags/id3v2/types.js";
import { KNOWN_FRAME_IDS } from "../../../tags/id3v2/writeId3v2/knownFrameIds.js";
import { writeId3v2 } from "../../../tags/id3v2/writeId3v2/writeId3v2.js";
import type { ChapterInfo, LyricsInfo, PictureInfo, WriteOptions } from "../../../types.js";
import { WAV_CHUNK_ID3 } from "../constants.js";

/** Arguments for {@link buildId3Chunk}. */
type Args = {
  /** Tag fields the caller wants reflected in the new `id3 ` chunk. */
  tag: WriteOptions["tag"];
  /** Existing `id3 ` chunk payload (the ID3v2 tag bytes), if any. */
  existing: Uint8Array | undefined;
  /** Pictures to embed as `APIC` frames, when the caller supplied them. */
  pictures?: readonly PictureInfo[];
  /** Chapters to embed as `CHAP` / `CTOC` frames, when the caller supplied them. */
  chapters?: readonly ChapterInfo[];
  /** Lyrics to embed as `USLT` / `SYLT` frames, when the caller supplied them. */
  lyrics?: LyricsInfo;
};

/**
 * Build the WAV `id3 ` chunk to emit, or return an empty buffer when
 * nothing needs to be written.
 *
 * The chunk is emitted whenever the source file already contained one (so
 * round-tripping does not lose the tag) or whenever the caller supplied
 * any recognised tag field. The ID3v2 major version mirrors the source's
 * version when known, defaulting to v2.3 — the variant most editors emit.
 * Frames whose ID is not synthesised from {@link TagData} (APIC, USLT,
 * CHAP, …) are preserved verbatim, mirroring the MP3 writer's contract.
 *
 * @returns The encoded chunk (header + payload + optional pad byte), or an
 *   empty `Uint8Array` when no chunk should be written.
 */
export const buildId3Chunk = ({ tag, existing, pictures, chapters, lyrics }: Args): Uint8Array => {
  const existingTag = existing === undefined ? undefined : parseId3v2(existing);
  const hasTagFields = Object.values(tag).some((value) => value !== undefined && value !== "");
  const hasExtras = pictures !== undefined || chapters !== undefined || lyrics !== undefined;
  if (existingTag === undefined && !hasTagFields && !hasExtras) {
    return new Uint8Array();
  }

  const sourceVersion = existingTag?.majorVersion;
  const majorVersion: Id3v2MajorVersion =
    sourceVersion === 3 || sourceVersion === 4 ? sourceVersion : 3;
  const writerVersion: 3 | 4 = majorVersion === 4 ? 4 : 3;

  const known = new Set(KNOWN_FRAME_IDS);
  const overridden = pickOverriddenIds({ pictures, chapters, lyrics });
  const preserveFrames: readonly Id3v2Frame[] =
    existingTag === undefined
      ? []
      : existingTag.frames.filter(
          (frame) => !known.has(frame.id) && frame.id !== "COMM" && !overridden.has(frame.id),
        );

  const extraFrames = synthesizeExtraFrames({
    pictures,
    chapters,
    lyrics,
    majorVersion: writerVersion,
  });
  const tagBytes = writeId3v2({
    majorVersion: writerVersion,
    tag,
    preserveFrames: [...extraFrames, ...preserveFrames],
  });

  const padding = tagBytes.length % 2;
  const out = Buffer.alloc(8 + tagBytes.length + padding);
  out.write(WAV_CHUNK_ID3, 0, 4, "latin1");
  out.writeUInt32LE(tagBytes.length, 4);
  out.set(tagBytes, 8);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Arguments for {@link pickOverriddenIds}. */
type OverrideArgs = {
  /** When defined, the writer manages `APIC` / `PIC` frames. */
  pictures: readonly PictureInfo[] | undefined;
  /** When defined, the writer manages `CHAP` / `CTOC` frames. */
  chapters: readonly ChapterInfo[] | undefined;
  /** When defined, the writer manages `USLT` / `SYLT` frames. */
  lyrics: LyricsInfo | undefined;
};

/**
 * Resolve which extra frame IDs the writer fully manages and should drop
 * from the preserved list when synthesizing replacements.
 *
 * @returns A set of ID3v2 frame IDs whose existing instances must be removed
 *   before the new frames are spliced in.
 */
const pickOverriddenIds = ({ pictures, chapters, lyrics }: OverrideArgs): Set<string> => {
  const out = new Set<string>();
  if (pictures !== undefined) {
    for (const id of EXTRA_FRAME_IDS) {
      if (id === "APIC" || id === "PIC") {
        out.add(id);
      }
    }
  }

  if (chapters !== undefined) {
    out.add("CHAP");
    out.add("CTOC");
  }

  if (lyrics !== undefined) {
    out.add("USLT");
    out.add("ULT");
    out.add("SYLT");
    out.add("SLT");
  }

  return out;
};
