import type { TagData } from "../../types.js";
import type { WavInfoEntry } from "./types.js";

/** Mapping from a `TagData` text field to its INFO sub-chunk identifier. */
const TEXT_FIELD_TO_KEY: ReadonlyArray<[keyof TagData, string]> = [
  ["title", "INAM"],
  ["artist", "IART"],
  ["album", "IPRD"],
  ["comment", "ICMT"],
  ["copyright", "ICOP"],
  ["genre", "IGNR"],
  ["language", "ILNG"],
  ["composer", "IMUS"],
];

/** INFO sub-chunk identifiers managed by this writer (used to drop preserved duplicates). */
export const MANAGED_INFO_KEYS: ReadonlySet<string> = new Set([
  "INAM",
  "TITL",
  "IART",
  "IPRD",
  "ICMT",
  "ICOP",
  "ICRD",
  "IGNR",
  "ILNG",
  "IMUS",
  "TRCK",
  "IPRT",
  "ITRK",
]);

/**
 * Project a {@link TagData} value onto a list of `LIST/INFO` entries to write.
 *
 * Only fields with non-empty values produce an entry. The recording-date
 * `ICRD` slot is filled from `recordingDate` when set; otherwise from `year`.
 * Track number becomes a `"X"` or `"X/Y"` string under the `ITRK` key (the
 * code most ATL.NET-compatible writers recognise).
 *
 * @param tag - Source tag fields.
 * @returns Entries in emission order.
 */
export const tagDataToInfoEntries = (tag: Partial<TagData>): readonly WavInfoEntry[] => {
  const entries: WavInfoEntry[] = [];
  for (const [field, key] of TEXT_FIELD_TO_KEY) {
    const value = tag[field];
    if (typeof value === "string" && value !== "") {
      entries.push({ key, value });
    }
  }

  if (tag.recordingDate !== undefined && tag.recordingDate !== "") {
    entries.push({ key: "ICRD", value: tag.recordingDate });
  } else if (tag.year !== undefined) {
    entries.push({ key: "ICRD", value: String(tag.year) });
  }

  if (tag.trackNumber !== undefined) {
    const value =
      tag.trackTotal !== undefined
        ? `${tag.trackNumber}/${tag.trackTotal}`
        : String(tag.trackNumber);
    entries.push({ key: "ITRK", value });
  }

  return entries;
};
