import type { TagData } from "../../../types.js";
import type { ContentDescription, ExtendedDescriptor } from "./types.js";

/**
 * `WM/...` descriptor names that this writer projects directly onto
 * {@link TagData}. Used both by the read path (to know which descriptor maps
 * to which field) and by the write path (to drop any preserved descriptor
 * that we are about to re-emit from `TagData`).
 */
export const MANAGED_EXTENDED_NAMES: ReadonlySet<string> = new Set([
  "WM/AlbumTitle",
  "WM/Genre",
  "WM/Year",
  "WM/TrackNumber",
  "WM/PartOfSet",
  "WM/Composer",
  "WM/AlbumArtist",
  "WM/Conductor",
  "WM/ContentGroupDescription",
  "WM/SubTitleDescription",
  "WM/BeatsPerMinute",
  "WM/Language",
  "WM/ISRC",
  "WM/Publisher",
  "WM/Writer",
  "WM/SharedUserRating",
]);

/** Arguments for {@link descriptorsToTagData}. */
type Args = {
  /** Decoded Content Description Object, when one was present in the file. */
  content: ContentDescription | undefined;
  /** Extended Content Description Object descriptors in file order. */
  extended: readonly ExtendedDescriptor[];
};

/**
 * Project the parsed WMA description objects onto the high-level
 * {@link TagData} shape used by every other format in this library.
 *
 * Content Description fields (`WM/TITLE`, `WM/AUTHOR`, `WM/COPYRIGHT`,
 * `WM/DESCRIPTION`) win when both objects describe the same logical field,
 * matching the conventional precedence used by Windows Media Player and
 * ATL.NET.
 *
 * @returns A `TagData` populated with the recognised fields.
 */
export const descriptorsToTagData = ({ content, extended }: Args): TagData => {
  const tag: TagData = {};
  for (const descriptor of extended) {
    applyExtended(tag, descriptor);
  }

  if (content !== undefined) {
    if (content.title !== "") {
      tag.title = content.title;
    }

    if (content.author !== "") {
      tag.artist = content.author;
    }

    if (content.copyright !== "") {
      tag.copyright = content.copyright;
    }

    if (content.description !== "") {
      tag.comment = content.description;
    }
  }

  return tag;
};

/**
 * Apply one Extended Content Description descriptor to the in-progress
 * {@link TagData}.
 *
 * Mutates `tag` in place. Unmapped descriptor names are silently ignored
 * here; the writer is responsible for round-tripping them via the original
 * extended descriptor list.
 *
 * @param tag - Mutable target the descriptor is merged into.
 * @param descriptor - One descriptor parsed from the Extended Content Description Object.
 */
const applyExtended = (tag: TagData, descriptor: ExtendedDescriptor): void => {
  const text = descriptor.value === undefined ? "" : String(descriptor.value);
  switch (descriptor.name) {
    case "WM/AlbumTitle":
      tag.album = text;
      break;
    case "WM/Genre":
      tag.genre = text;
      break;
    case "WM/Year": {
      const year = Number.parseInt(text, 10);
      if (Number.isFinite(year) && year > 0) {
        tag.year = year;
      }

      break;
    }
    case "WM/TrackNumber": {
      const { number, total } = parseNumberPair(text);
      if (number !== undefined) {
        tag.trackNumber = number;
      }

      if (total !== undefined) {
        tag.trackTotal = total;
      }

      break;
    }
    case "WM/PartOfSet": {
      const { number, total } = parseNumberPair(text);
      if (number !== undefined) {
        tag.discNumber = number;
      }

      if (total !== undefined) {
        tag.discTotal = total;
      }

      break;
    }
    case "WM/Composer":
      tag.composer = text;
      break;
    case "WM/AlbumArtist":
      tag.albumArtist = text;
      break;
    case "WM/Conductor":
      tag.conductor = text;
      break;
    case "WM/ContentGroupDescription":
      tag.group = text;
      break;
    case "WM/SubTitleDescription":
      tag.description = text;
      break;
    case "WM/BeatsPerMinute": {
      const bpm = Number.parseInt(text, 10);
      if (Number.isFinite(bpm) && bpm >= 0) {
        tag.bpm = bpm;
      }

      break;
    }
    case "WM/Language":
      tag.language = text;
      break;
    case "WM/ISRC":
      tag.isrc = text;
      break;
    case "WM/Publisher":
      tag.publisher = text;
      break;
    case "WM/Writer":
      tag.lyricist = text;
      break;
    case "WM/SharedUserRating": {
      // ATL.NET treats SharedUserRating as a 0..99 integer; map to [0, 1].
      const numeric = typeof descriptor.value === "number" ? descriptor.value : Number(text);
      if (Number.isFinite(numeric) && numeric >= 0) {
        tag.rating = Math.min(numeric, 99) / 99;
      }

      break;
    }
  }
};

/**
 * Parse a `"X"` or `"X/Y"` string into a `(number, total)` pair.
 *
 * Used by `WM/TrackNumber` / `WM/PartOfSet`, both of which encode the pair
 * (number, total) as a single Unicode string descriptor. Either component
 * is `undefined` when missing or unparseable.
 *
 * @param text - Source string in `"X"` or `"X/Y"` form.
 * @returns The decoded pair.
 */
const parseNumberPair = (
  text: string,
): { number: number | undefined; total: number | undefined } => {
  if (text === "") {
    return { number: undefined, total: undefined };
  }

  const [head, tail] = text.split("/", 2);
  const headNumber = Number.parseInt(head ?? "", 10);
  const tailNumber = tail === undefined ? Number.NaN : Number.parseInt(tail, 10);
  return {
    number: Number.isFinite(headNumber) && headNumber >= 0 ? headNumber : undefined,
    total: Number.isFinite(tailNumber) && tailNumber >= 0 ? tailNumber : undefined,
  };
};
