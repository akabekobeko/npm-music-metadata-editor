import { ItunesDataType } from "../../constants.js";

/**
 * iTunes type indicator → MIME type for the picture types we support
 * directly. Other indicators (e.g. BMP) fall back to `application/octet-stream`
 * because we have no first-class support for them.
 */
export const PICTURE_MIME_BY_TYPE: ReadonlyMap<number, string> = new Map([
  [ItunesDataType.Jpeg, "image/jpeg"],
  [ItunesDataType.Png, "image/png"],
  [ItunesDataType.Bmp, "image/bmp"],
]);

/**
 * Static ID3v1 genre table used to resolve `gnre` (1-based index) atoms back
 * to a textual name. Only the original 80 entries are encoded — anything
 * past that is treated as unknown.
 */
export const ID3V1_GENRES: readonly string[] = [
  "Blues",
  "Classic Rock",
  "Country",
  "Dance",
  "Disco",
  "Funk",
  "Grunge",
  "Hip-Hop",
  "Jazz",
  "Metal",
  "New Age",
  "Oldies",
  "Other",
  "Pop",
  "R&B",
  "Rap",
  "Reggae",
  "Rock",
  "Techno",
  "Industrial",
  "Alternative",
  "Ska",
  "Death Metal",
  "Pranks",
  "Soundtrack",
  "Euro-Techno",
  "Ambient",
  "Trip-Hop",
  "Vocal",
  "Jazz+Funk",
  "Fusion",
  "Trance",
  "Classical",
  "Instrumental",
  "Acid",
  "House",
  "Game",
  "Sound Clip",
  "Gospel",
  "Noise",
  "AlternRock",
  "Bass",
  "Soul",
  "Punk",
  "Space",
  "Meditative",
  "Instrumental Pop",
  "Instrumental Rock",
  "Ethnic",
  "Gothic",
];
