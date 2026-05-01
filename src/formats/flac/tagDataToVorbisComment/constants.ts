import type { TagData } from "../../../types.js";

/**
 * Mapping from {@link TagData} field to the Vorbis Comment keys that field
 * controls.
 *
 * The first entry is the canonical key emitted on write; the remaining
 * entries are aliases that are *also* dropped from `preserveEntries` when the
 * field is provided, so we don't end up with both `TRACKTOTAL` and
 * `TOTALTRACKS` after a rewrite.
 */
export const FIELD_KEYS: Readonly<Partial<Record<keyof TagData, readonly string[]>>> = {
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
