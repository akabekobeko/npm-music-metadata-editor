import type { TagData } from "../../../types.js";

/**
 * Map from upper-cased Vorbis Comment field name to the {@link TagData} key
 * the value lands under.
 *
 * The Vorbis Comment specification says field names are case-insensitive, so
 * the lookup is normalised to upper case at read time. Multiple aliases for
 * the same target field (e.g. `TRACKTOTAL` vs `TOTALTRACKS`) coexist.
 *
 * Source: Vorbis Comment field names commonly used in the wild + ATL.NET
 * `VorbisTag.frameMapping`.
 */
export const FIELD_MAP: Readonly<Record<string, keyof TagData>> = {
  TITLE: "title",
  ARTIST: "artist",
  ALBUM: "album",
  ALBUMARTIST: "albumArtist",
  COMPOSER: "composer",
  CONDUCTOR: "conductor",
  LYRICIST: "lyricist",
  PUBLISHER: "publisher",
  COPYRIGHT: "copyright",
  COMMENT: "comment",
  DESCRIPTION: "description",
  GENRE: "genre",
  LANGUAGE: "language",
  ISRC: "isrc",
  CATALOGNUMBER: "productId",
  PRODUCTNUMBER: "productId",
  DATE: "recordingDate",
  ORIGINALDATE: "originalReleaseDate",
  RELEASEDATE: "publishingDate",
  TRACKNUMBER: "trackNumber",
  TRACKTOTAL: "trackTotal",
  TOTALTRACKS: "trackTotal",
  DISCNUMBER: "discNumber",
  DISCTOTAL: "discTotal",
  TOTALDISCS: "discTotal",
  BPM: "bpm",
};

/** Fields that should be parsed as integers (they have numeric `TagData` types). */
export const NUMERIC_FIELDS: ReadonlySet<keyof TagData> = new Set([
  "year",
  "trackNumber",
  "trackTotal",
  "discNumber",
  "discTotal",
  "bpm",
]);
