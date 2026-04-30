import type { VorbisComment } from "../../tags/vorbisComment/types.js";
import type { TagData } from "../../types.js";

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
const FIELD_MAP: Readonly<Record<string, keyof TagData>> = {
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
const NUMERIC_FIELDS: ReadonlySet<keyof TagData> = new Set([
  "year",
  "trackNumber",
  "trackTotal",
  "discNumber",
  "discTotal",
  "bpm",
]);

/** Arguments for {@link assignSlashPair}. */
type SlashPairArgs = {
  /** Tag data object the parsed components are written into (mutated). */
  target: TagData;
  /** Source text in either `"N"` or `"N/Total"` form. */
  text: string;
  /** Field that receives the numerator. */
  numberField: keyof TagData;
  /** Field that receives the denominator (when present). */
  totalField: keyof TagData;
};

/**
 * Parse a free-form `"X"` or `"X/Y"` numeric string and assign the components
 * to `numberField` / `totalField` on `target`.
 */
const assignSlashPair = ({ target, text, numberField, totalField }: SlashPairArgs): void => {
  const [numberPart, totalPart] = text.split("/");
  const num = Number.parseInt(numberPart ?? "", 10);
  if (Number.isFinite(num)) {
    (target as Record<string, unknown>)[numberField] = num;
  }

  if (totalPart !== undefined) {
    const total = Number.parseInt(totalPart, 10);
    if (Number.isFinite(total)) {
      (target as Record<string, unknown>)[totalField] = total;
    }
  }
};

/**
 * Project a Vorbis Comment block onto our high-level {@link TagData} shape.
 *
 * - Recognised keys land on the named field.
 * - `TRACKNUMBER` / `DISCNUMBER` accept either bare numbers or `"X/Y"` form,
 *   in which case the second value populates the corresponding `*Total` field.
 * - `DATE` is stored verbatim under `recordingDate`; if the first 4 chars
 *   parse as a year, `year` is also populated.
 * - For repeated keys (multi-value), the *first* value wins on `TagData`. The
 *   raw multi-value list remains accessible via the underlying
 *   {@link VorbisComment} entries.
 *
 * @param comment - The decoded Vorbis Comment block.
 * @returns A `TagData` populated with the recognised fields.
 */
export const vorbisCommentToTagData = (comment: VorbisComment): TagData => {
  const out: TagData = {};
  // Track which target fields have already been assigned so that multi-value
  // entries don't overwrite the first value.
  const assigned = new Set<keyof TagData>();

  for (const entry of comment.comments) {
    const upperKey = entry.key.toUpperCase();
    const field = FIELD_MAP[upperKey];
    if (field === undefined) {
      continue;
    }

    // `trackNumber` / `discNumber` may carry the corresponding `*Total` in a
    // single string. Run that path before the generic numeric guard.
    if (field === "trackNumber" || field === "discNumber") {
      if (assigned.has(field)) {
        continue;
      }

      const totalField = field === "trackNumber" ? "trackTotal" : "discTotal";
      assignSlashPair({ target: out, text: entry.value, numberField: field, totalField });
      assigned.add(field);
      if (out[totalField] !== undefined) {
        assigned.add(totalField);
      }

      continue;
    }

    if (assigned.has(field)) {
      continue;
    }

    if (NUMERIC_FIELDS.has(field)) {
      const num = Number.parseInt(entry.value, 10);
      if (Number.isFinite(num)) {
        (out as Record<string, unknown>)[field] = num;
        assigned.add(field);
      }

      continue;
    }

    if (entry.value === "") {
      continue;
    }

    (out as Record<string, unknown>)[field] = entry.value;
    assigned.add(field);

    // DATE may double as the source of `year` when it starts with `YYYY`.
    if (field === "recordingDate" && out.year === undefined) {
      const yearPart = entry.value.slice(0, 4);
      const year = Number.parseInt(yearPart, 10);
      if (Number.isFinite(year) && yearPart.length === 4) {
        out.year = year;
        assigned.add("year");
      }
    }
  }

  return out;
};
