import type { TagPatch } from "../../../types.js";
import { resolvePatchValue } from "../../../utils/tagPatch/resolvePatchValue.js";
import type { ContentDescription } from "./types.js";

/** Arguments for {@link tagDataToContentDescription}. */
type Args = {
  /** New tag fields the caller wants to apply (`null` / `""` clears the slot). */
  tag: TagPatch;
  /** Pre-existing Content Description (preserved for fields the caller leaves untouched). */
  existing: ContentDescription | undefined;
};

/**
 * Build a fresh Content Description from new tag fields, falling back to the
 * existing Content Description for fields the caller doesn't override.
 * Fields set to `null` / `""` are blanked instead of falling back.
 *
 * Returning `undefined` for an empty result lets the writer decide whether
 * to emit the Content Description Object at all — avoiding a useless
 * 34-byte object in files that simply don't carry any of these five fields.
 *
 * @returns The merged Content Description, or `undefined` when every field
 *   would be empty.
 */
export const tagDataToContentDescription = ({
  tag,
  existing,
}: Args): ContentDescription | undefined => {
  const result: ContentDescription = {
    title: resolvePatchValue(tag.title, existing?.title) ?? "",
    author: resolvePatchValue(tag.artist, existing?.author) ?? "",
    copyright: resolvePatchValue(tag.copyright, existing?.copyright) ?? "",
    description: resolvePatchValue(tag.comment, existing?.description) ?? "",
    rating: existing?.rating ?? "",
  };
  const empty =
    result.title === "" &&
    result.author === "" &&
    result.copyright === "" &&
    result.description === "" &&
    result.rating === "";
  return empty ? undefined : result;
};
