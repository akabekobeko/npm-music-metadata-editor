import type { TagData } from "../../../types.js";
import { ASF_DESCRIPTOR_TYPE } from "../constants.js";
import { descriptorsToTagData, MANAGED_EXTENDED_NAMES } from "./descriptorsToTagData.js";
import type { ExtendedDescriptor } from "./types.js";

/** Arguments for {@link tagDataToExtendedDescriptors}. */
type Args = {
  /** New tag fields the caller wants to apply. */
  tag: Partial<TagData>;
  /** Pre-existing extended descriptors, used for round-tripping unknown ones. */
  existing: readonly ExtendedDescriptor[];
};

/**
 * Build the new Extended Content Description from `tag` plus any existing
 * descriptors whose names this writer does not manage.
 *
 * The merge strategy matches what ATL.NET does:
 * - Managed names (those in {@link MANAGED_EXTENDED_NAMES}) are dropped from
 *   the existing list and re-emitted from the merged tag. This avoids
 *   duplicate descriptors when the caller tweaks one of the mapped fields.
 * - Unmanaged names round-trip verbatim, preserving the bytes the reader
 *   captured on `rawValue`.
 *
 * Managed fields the caller doesn't override fall back to the existing
 * value, so a partial edit (`tag: { album: "New" }`) doesn't accidentally
 * blank out the composer / genre / track number that were already there.
 *
 * @returns Descriptors in emission order.
 */
export const tagDataToExtendedDescriptors = ({
  tag,
  existing,
}: Args): readonly ExtendedDescriptor[] => {
  const fromExisting = descriptorsToTagData({ content: undefined, extended: existing });
  const merged: Partial<TagData> = { ...fromExisting, ...tag };

  const out: ExtendedDescriptor[] = existing.filter((d) => !MANAGED_EXTENDED_NAMES.has(d.name));
  const stringFields: ReadonlyArray<[string, string | undefined]> = [
    ["WM/AlbumTitle", merged.album],
    ["WM/Genre", merged.genre],
    ["WM/Composer", merged.composer],
    ["WM/AlbumArtist", merged.albumArtist],
    ["WM/Conductor", merged.conductor],
    ["WM/ContentGroupDescription", merged.group],
    ["WM/SubTitleDescription", merged.description],
    ["WM/Language", merged.language],
    ["WM/ISRC", merged.isrc],
    ["WM/Publisher", merged.publisher],
    ["WM/Writer", merged.lyricist],
  ];

  for (const [name, value] of stringFields) {
    const descriptor = stringDescriptor(name, value);
    if (descriptor !== undefined) {
      out.push(descriptor);
    }
  }

  if (merged.year !== undefined) {
    pushIfDefined(out, stringDescriptor("WM/Year", String(merged.year)));
  }

  if (merged.bpm !== undefined) {
    pushIfDefined(out, stringDescriptor("WM/BeatsPerMinute", String(merged.bpm)));
  }

  if (merged.trackNumber !== undefined) {
    const value =
      merged.trackTotal !== undefined
        ? `${merged.trackNumber}/${merged.trackTotal}`
        : String(merged.trackNumber);
    pushIfDefined(out, stringDescriptor("WM/TrackNumber", value));
  }

  if (merged.discNumber !== undefined) {
    const value =
      merged.discTotal !== undefined
        ? `${merged.discNumber}/${merged.discTotal}`
        : String(merged.discNumber);
    pushIfDefined(out, stringDescriptor("WM/PartOfSet", value));
  }

  if (merged.rating !== undefined) {
    const clamped = Math.max(0, Math.min(1, merged.rating));
    out.push({
      name: "WM/SharedUserRating",
      type: ASF_DESCRIPTOR_TYPE.Dword,
      value: Math.round(clamped * 99),
      rawValue: new Uint8Array(),
    });
  }

  return out;
};

/**
 * Build a UnicodeString descriptor when `value` is a non-empty string.
 *
 * Returns `undefined` for empty / unset values, which the caller drops —
 * skipping these keeps round-trips idempotent (a tag without an album
 * doesn't generate a `WM/AlbumTitle` with an empty value).
 *
 * @param name - Descriptor name (e.g. `"WM/AlbumTitle"`).
 * @param value - Source value, or `undefined` when the field is unset.
 * @returns A fresh descriptor, or `undefined` when nothing should be emitted.
 */
const stringDescriptor = (
  name: string,
  value: string | undefined,
): ExtendedDescriptor | undefined => {
  if (typeof value !== "string" || value === "") {
    return undefined;
  }

  return {
    name,
    type: ASF_DESCRIPTOR_TYPE.UnicodeString,
    value,
    rawValue: new Uint8Array(),
  };
};

/**
 * Append `descriptor` to `out` when it is defined.
 *
 * @param out - Mutable destination list.
 * @param descriptor - Descriptor to append, or `undefined` to skip.
 */
const pushIfDefined = (
  out: ExtendedDescriptor[],
  descriptor: ExtendedDescriptor | undefined,
): void => {
  if (descriptor !== undefined) {
    out.push(descriptor);
  }
};
