import type { TagData } from "../../../types.js";

/**
 * Map from upper-cased APE item key to the {@link TagData} field the value
 * lands under.
 *
 * APE keys are case-insensitive in practice, so the lookup is normalised to
 * upper case at read time. Multiple aliases for the same target field
 * coexist — e.g. `DISC` and `DISCNUMBER` are both used in the wild.
 *
 * Source: APE tag key list at <https://wiki.hydrogenaud.io/index.php?title=APE_key>
 * cross-referenced with ATL.NET `APEtag.frameMapping`.
 */
export const FIELD_MAP: Readonly<Record<string, keyof TagData>> = {
  TITLE: "title",
  ARTIST: "artist",
  ALBUM: "album",
  ALBUMARTIST: "albumArtist",
  "ALBUM ARTIST": "albumArtist",
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
  YEAR: "year",
  RECORDDATE: "recordingDate",
  ORIGINALDATE: "originalReleaseDate",
  RELEASEDATE: "publishingDate",
  TRACK: "trackNumber",
  TRACKNUMBER: "trackNumber",
  TRACKTOTAL: "trackTotal",
  TOTALTRACKS: "trackTotal",
  DISC: "discNumber",
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
