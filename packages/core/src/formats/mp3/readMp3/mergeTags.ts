import type { TagData } from "../../../types.js";

/**
 * Merge two tag projections, preferring `primary`'s fields over `fallback`'s.
 *
 * @param primary - Higher-priority fields. Non-empty values overwrite `fallback`'s.
 * @param fallback - Lower-priority fields. Used when `primary` does not provide a value.
 * @returns A new `TagData` with the merged fields.
 */
export const mergeTags = (primary: TagData, fallback: TagData): TagData => {
  const out: TagData = { ...fallback };
  for (const [key, value] of Object.entries(primary)) {
    if (value !== undefined && value !== "") {
      (out as Record<string, unknown>)[key] = value;
    }
  }

  return out;
};
