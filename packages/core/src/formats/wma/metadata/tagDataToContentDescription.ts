import type { TagData } from "../../../types.js";
import type { ContentDescription } from "./types.js";

/** Arguments for {@link tagDataToContentDescription}. */
type Args = {
  /** New tag fields the caller wants to apply. */
  tag: Partial<TagData>;
  /** Pre-existing Content Description (preserved for fields the caller leaves untouched). */
  existing: ContentDescription | undefined;
};

/**
 * Build a fresh Content Description from new tag fields, falling back to the
 * existing Content Description for fields the caller doesn't override.
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
    title: tag.title ?? existing?.title ?? "",
    author: tag.artist ?? existing?.author ?? "",
    copyright: tag.copyright ?? existing?.copyright ?? "",
    description: tag.comment ?? existing?.description ?? "",
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
