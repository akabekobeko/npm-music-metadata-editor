import type { TagData } from "../../../types.js";
import { assignSlashPair } from "../../vorbisComment/vorbisCommentToTagData/assignSlashPair.js";
import { ApeItemKind } from "../constants.js";
import type { ApeTag } from "../types.js";
import { FIELD_MAP, NUMERIC_FIELDS } from "./constants.js";

/**
 * Project an APE tag onto our high-level {@link TagData} shape.
 *
 * - Recognised keys (case-insensitive) land on the named field.
 * - `TRACK`/`TRACKNUMBER` and `DISC`/`DISCNUMBER` accept either bare numbers
 *   or `"X/Y"` form, in which case the second value populates the
 *   corresponding `*Total` field.
 * - Binary / external items are skipped — the bytes round-trip via the
 *   underlying {@link ApeTag} but they do not have a slot in `TagData`.
 *
 * @param tag - The decoded APE tag.
 * @returns A `TagData` populated with the recognised fields.
 */
export const apeTagToTagData = (tag: ApeTag): TagData => {
  const out: TagData = {};
  // Track which target fields have already been assigned so multi-value
  // entries don't overwrite the first value (mirrors Vorbis Comment behaviour).
  const assigned = new Set<keyof TagData>();

  for (const item of tag.items) {
    if (item.kind !== ApeItemKind.Text || typeof item.value !== "string") {
      continue;
    }

    const field = FIELD_MAP[item.key.toUpperCase()];
    if (field === undefined) {
      continue;
    }

    if (field === "trackNumber" || field === "discNumber") {
      if (assigned.has(field)) {
        continue;
      }

      const totalField = field === "trackNumber" ? "trackTotal" : "discTotal";
      assignSlashPair({ target: out, text: item.value, numberField: field, totalField });
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
      const num = Number.parseInt(item.value, 10);
      if (Number.isFinite(num)) {
        (out as Record<string, unknown>)[field] = num;
        assigned.add(field);
      }

      continue;
    }

    if (item.value === "") {
      continue;
    }

    (out as Record<string, unknown>)[field] = item.value;
    assigned.add(field);
  }

  return out;
};
