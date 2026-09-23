import type { TagData, TagPatch } from "../../types.js";
import { hasTagValue } from "./hasTagValue.js";

/** Arguments for {@link applyTagPatch}. */
type Args = {
  /** Tag fields currently stored in the file. */
  existing: TagData;
  /** Caller-supplied fields to merge in. */
  patch: TagPatch;
};

/**
 * Merge a {@link TagPatch} onto the tag currently stored in a file.
 *
 * Fields the patch leaves `undefined` flow through from `existing`; fields
 * set to `null` / `""` are removed; everything else is overwritten. The
 * result never contains `null` or empty-string values, so writers that
 * rebuild a tag block from scratch can consume it directly.
 *
 * @returns A fresh {@link TagData} (neither input is mutated).
 */
export const applyTagPatch = ({ existing, patch }: Args): TagData => {
  const out: Record<string, string | number | undefined> = { ...existing };
  for (const [field, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }

    if (hasTagValue(value)) {
      out[field] = value;
    } else {
      delete out[field];
    }
  }

  return out as TagData;
};
