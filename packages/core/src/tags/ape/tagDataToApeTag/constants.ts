import type { TagData } from "../../../types.js";

/**
 * Mapping from {@link TagData} field to the APE item keys that field controls.
 *
 * The first entry is the canonical key emitted on write; the remaining
 * entries are aliases that are *also* dropped from `preserveItems` when the
 * field is provided, so we don't end up with both `TRACK` and `TRACKNUMBER`
 * after a rewrite.
 */
export const FIELD_KEYS: Readonly<Partial<Record<keyof TagData, readonly string[]>>> = {
  title: ["Title"],
  artist: ["Artist"],
  album: ["Album"],
  albumArtist: ["Album Artist", "AlbumArtist"],
  composer: ["Composer"],
  conductor: ["Conductor"],
  lyricist: ["Lyricist"],
  publisher: ["Publisher"],
  copyright: ["Copyright"],
  comment: ["Comment"],
  description: ["Description"],
  genre: ["Genre"],
  language: ["Language"],
  isrc: ["ISRC"],
  productId: ["CatalogNumber"],
  year: ["Year"],
  recordingDate: ["Record Date"],
  originalReleaseDate: ["Original Date"],
  publishingDate: ["Release Date"],
  bpm: ["BPM"],
  trackNumber: ["Track", "TrackNumber"],
  trackTotal: ["TrackTotal", "TotalTracks"],
  discNumber: ["Disc", "DiscNumber"],
  discTotal: ["DiscTotal", "TotalDiscs"],
};
