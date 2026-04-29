import { ID3V1_TAG_SIZE } from "../../tags/id3v1/constants.js";
import { readId3v1 } from "../../tags/id3v1/readId3v1.js";
import { id3v2TagToTagData, readId3v2 } from "../../tags/id3v2/readId3v2.js";
import type { MetadataReadResult, TagData } from "../../types.js";

/**
 * Read MP3 metadata.
 *
 * Order: ID3v2 (head) → ID3v1 (tail). When both are present, ID3v2 wins on
 * field conflicts; ID3v1 only fills in fields that ID3v2 left blank.
 *
 * @param input - Whole-file bytes.
 * @returns A {@link MetadataReadResult} populated with the merged tag data.
 *   `pictures` / `chapters` / `lyrics` remain empty in Phase 2 — APIC / CHAP /
 *   USLT structuring lands in Phase 9.
 */
export const readMp3 = async (input: Uint8Array): Promise<MetadataReadResult> => {
  const id3v2 = readId3v2(input);
  const id3v1 = readId3v1(input);
  const merged = mergeTags(id3v2 === undefined ? {} : id3v2TagToTagData(id3v2), id3v1Tag(id3v1));
  return {
    audioFormat: "mp3",
    tag: merged,
    pictures: [],
    chapters: [],
  };
};

/** Convert {@link readId3v1}'s output into a `TagData`-shaped object. */
const id3v1Tag = (id3v1: ReturnType<typeof readId3v1>): TagData => {
  if (id3v1 === undefined) {
    return {};
  }

  const out: TagData = {};
  if (id3v1.title !== "") out.title = id3v1.title;
  if (id3v1.artist !== "") out.artist = id3v1.artist;
  if (id3v1.album !== "") out.album = id3v1.album;
  if (id3v1.comment !== "") out.comment = id3v1.comment;
  if (id3v1.genre !== undefined) out.genre = id3v1.genre;
  if (id3v1.year !== "") {
    const parsed = Number.parseInt(id3v1.year, 10);
    if (Number.isFinite(parsed)) {
      out.year = parsed;
    }
  }

  if (id3v1.trackNumber !== undefined) {
    out.trackNumber = id3v1.trackNumber;
  }

  return out;
};

/** Merge two tag projections, preferring `primary`'s fields over `fallback`'s. */
const mergeTags = (primary: TagData, fallback: TagData): TagData => {
  const out: TagData = { ...fallback };
  for (const [key, value] of Object.entries(primary)) {
    if (value !== undefined && value !== "") {
      (out as Record<string, unknown>)[key] = value;
    }
  }

  return out;
};

/**
 * Compute the byte offset of the first MPEG audio frame in `input`.
 *
 * Used by the writer to know where the audio payload starts so the new ID3v2
 * tag can be spliced in front of it. Returns `0` when no leading ID3v2 is
 * present, or `ID3V2_HEADER_SIZE + bodySize` when one is.
 */
export const findMp3AudioStart = (input: Uint8Array): number => {
  const id3v2 = readId3v2(input);
  if (id3v2 === undefined) {
    return 0;
  }

  return id3v2.totalSize;
};

/**
 * Compute the byte offset just past the end of the audio data, i.e. the start
 * of the trailing ID3v1 tag (when present) or the file end.
 */
export const findMp3AudioEnd = (input: Uint8Array): number => {
  const id3v1 = readId3v1(input);
  return id3v1 === undefined ? input.length : input.length - ID3V1_TAG_SIZE;
};
