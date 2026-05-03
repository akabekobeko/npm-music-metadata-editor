import type { TagData } from "../../types.js";
import type { AiffNativeTags } from "./types.js";

/** Joiner used to concatenate multiple `ANNO` chunks into a single comment string. */
const ANNOTATION_SEPARATOR = "\n";

/**
 * Project the decoded native AIFF chunks onto our common {@link TagData}
 * shape.
 *
 * `NAME` → `title`, `AUTH` → `artist`, `(c) ` → `copyright`. Every `ANNO`
 * chunk is concatenated (newline-separated) into `comment`; this matches
 * how ATL.NET surfaces them.
 *
 * @param native - Decoded native chunk texts.
 * @returns A `TagData` populated with the recognised fields. Empty / missing
 *   chunks are omitted.
 */
export const nativeTagsToTagData = (native: AiffNativeTags): TagData => {
  const result: TagData = {};
  if (native.name !== undefined && native.name !== "") {
    result.title = native.name;
  }

  if (native.author !== undefined && native.author !== "") {
    result.artist = native.author;
  }

  if (native.copyright !== undefined && native.copyright !== "") {
    result.copyright = native.copyright;
  }

  const annotations = native.annotations.filter((value) => value !== "");
  if (annotations.length > 0) {
    result.comment = annotations.join(ANNOTATION_SEPARATOR);
  }

  return result;
};
