import type { TagData } from "../../../types.js";
import type { VorbisComment } from "../types.js";
import { assignSlashPair } from "./assignSlashPair.js";
import { FIELD_MAP, NUMERIC_FIELDS } from "./constants.js";

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
