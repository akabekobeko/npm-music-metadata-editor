import type { VorbisComment, VorbisCommentEntry } from "../../tags/vorbisComment/types.js";
import type { TagData } from "../../types.js";

/**
 * Mapping from {@link TagData} field to the Vorbis Comment keys that field
 * controls.
 *
 * The first entry is the canonical key emitted on write; the remaining
 * entries are aliases that are *also* dropped from `preserveEntries` when the
 * field is provided, so we don't end up with both `TRACKTOTAL` and
 * `TOTALTRACKS` after a rewrite.
 */
const FIELD_KEYS: Readonly<Partial<Record<keyof TagData, readonly string[]>>> = {
  title: ["TITLE"],
  artist: ["ARTIST"],
  album: ["ALBUM"],
  albumArtist: ["ALBUMARTIST"],
  composer: ["COMPOSER"],
  conductor: ["CONDUCTOR"],
  lyricist: ["LYRICIST"],
  publisher: ["PUBLISHER"],
  copyright: ["COPYRIGHT"],
  comment: ["COMMENT"],
  description: ["DESCRIPTION"],
  genre: ["GENRE"],
  language: ["LANGUAGE"],
  isrc: ["ISRC"],
  productId: ["CATALOGNUMBER", "PRODUCTNUMBER"],
  recordingDate: ["DATE"],
  originalReleaseDate: ["ORIGINALDATE"],
  publishingDate: ["RELEASEDATE"],
  bpm: ["BPM"],
  trackNumber: ["TRACKNUMBER"],
  trackTotal: ["TRACKTOTAL", "TOTALTRACKS"],
  discNumber: ["DISCNUMBER"],
  discTotal: ["DISCTOTAL", "TOTALDISCS"],
};

/** Arguments for {@link tagDataToVorbisComment}. */
type Args = {
  /**
   * Tag fields to write. Fields left `undefined` are preserved as-is from
   * `preserveEntries`; fields set to `""` are explicitly removed.
   */
  tag: Partial<TagData>;
  /**
   * Vendor string to embed in the new block. Pass through the value from the
   * existing tag (Vorbis Comment requires a vendor).
   */
  vendor: string;
  /**
   * Existing entries to preserve (multi-value, custom keys, ...). Entries
   * whose key clashes with a field that the caller is managing are dropped.
   */
  preserveEntries?: readonly VorbisCommentEntry[];
};

/**
 * Stringify a {@link TagData} value for emission as a Vorbis Comment.
 *
 * @returns A string representation, or `undefined` when the value should not
 *   be emitted (e.g. the field was set to `""` to clear it).
 */
const stringifyValue = (value: string | number | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const text = typeof value === "string" ? value : String(value);
  return text === "" ? undefined : text;
};

/**
 * Build a Vorbis Comment block from a {@link TagData} merged with existing
 * entries.
 *
 * Behaviour:
 * - Each recognised field whose value is `undefined` is left untouched: the
 *   original entries (including multi-value duplicates and aliases) flow
 *   through `preserveEntries`.
 * - Each recognised field whose value is set is emitted under the canonical
 *   key, and *all* aliases (`TRACKTOTAL`/`TOTALTRACKS`, ...) are dropped from
 *   `preserveEntries` so we don't end up with stale duplicates.
 * - `year` doubles as the source of `DATE` only when `recordingDate` is not
 *   provided.
 *
 * @returns A {@link VorbisComment} ready to encode with `writeVorbisComment`.
 */
export const tagDataToVorbisComment = ({ tag, vendor, preserveEntries }: Args): VorbisComment => {
  const comments: VorbisCommentEntry[] = [];
  const managedKeys = new Set<string>();

  // Walk in declaration order so the output is deterministic.
  for (const [field, keys] of Object.entries(FIELD_KEYS) as [keyof TagData, readonly string[]][]) {
    const raw = tag[field];
    if (raw === undefined) {
      continue;
    }

    for (const key of keys) {
      managedKeys.add(key);
    }

    const canonicalKey = keys[0];
    if (canonicalKey === undefined) {
      continue;
    }

    const text = stringifyValue(raw as string | number);
    if (text !== undefined) {
      comments.push({ key: canonicalKey, value: text });
    }
  }

  // `year` shares the `DATE` key with `recordingDate`. Only fall back to
  // `year` when the caller did not provide `recordingDate`.
  if (tag.year !== undefined && tag.recordingDate === undefined) {
    managedKeys.add("DATE");
    const yearText = stringifyValue(tag.year);
    if (yearText !== undefined) {
      comments.push({ key: "DATE", value: yearText });
    }
  }

  if (preserveEntries !== undefined) {
    for (const entry of preserveEntries) {
      if (managedKeys.has(entry.key.toUpperCase())) {
        continue;
      }

      comments.push(entry);
    }
  }

  return { vendor, comments };
};
