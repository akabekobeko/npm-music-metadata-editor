import { lyricsToVorbisComment } from "../../extras/lyrics/converters/lyricsToVorbisComment.js";
import { tagDataToVorbisComment } from "../../tags/vorbisComment/tagDataToVorbisComment/tagDataToVorbisComment.js";
import type { VorbisCommentEntry } from "../../tags/vorbisComment/types.js";
import type { PictureInfo, WriteOptions } from "../../types.js";
import { PictureKind } from "../../types.js";
import { buildFlac } from "./buildFlac/buildFlac.js";
import { parseFlac } from "./parseFlac/parseFlac.js";
import type { FlacWritablePicture } from "./types.js";

/** Default vendor string used when the source file had no Vorbis Comment block. */
const DEFAULT_VENDOR = "music-metadata-editor";

/** Vorbis Comment keys the FLAC writer manages when extras are supplied. */
const MANAGED_LYRICS_KEYS: readonly string[] = ["LYRICS", "UNSYNCEDLYRICS", "UNSYNCED LYRICS"];

/**
 * Rewrite a FLAC file with new metadata.
 *
 * Strategy:
 * 1. Parse the existing metadata region to get STREAMINFO + pass-through
 *    blocks + the original audio offset.
 * 2. Build a fresh Vorbis Comment block from `options.tag`, preserving any
 *    existing entries whose key isn't managed by the high-level tag mapping.
 *    When `options.lyrics` is set, replace any existing `LYRICS` entries.
 * 3. Replace the original `PICTURE` blocks when `options.pictures` is set;
 *    otherwise carry them through unchanged.
 * 4. Use {@link rebalancePadding} to size the trailing padding block so the
 *    audio stays at its original offset whenever possible.
 *
 * @param input - Original FLAC bytes.
 * @param options - {@link WriteOptions} carrying the tag fields to merge in.
 * @returns Rebuilt file bytes ready to persist.
 */
export const writeFlac = async (input: Uint8Array, options: WriteOptions): Promise<Uint8Array> => {
  const parsed = parseFlac(input);
  const existingVendor = parsed.vorbisComment?.vendor ?? DEFAULT_VENDOR;
  const preserveEntries = filterPreservedEntries({
    entries: parsed.vorbisComment?.comments ?? [],
    overrideLyrics: options.lyrics !== undefined,
  });
  const lyricsEntries = synthesizeLyricsEntries(options.lyrics);

  const vorbisComment = tagDataToVorbisComment({
    tag: options.tag,
    vendor: existingVendor,
    preserveEntries: [...preserveEntries, ...lyricsEntries],
  });

  const pictures = pickPictures({ options, existing: parsed.pictures });
  return buildFlac({
    parsed,
    source: input,
    vorbisComment,
    pictures,
  });
};

/** Arguments for {@link filterPreservedEntries}. */
type FilterArgs = {
  /** Source entries (typically the existing Vorbis Comment block). */
  entries: readonly VorbisCommentEntry[];
  /** Whether the writer is overriding lyrics — drops the managed keys when `true`. */
  overrideLyrics: boolean;
};

/**
 * Drop entries the writer is about to re-emit so the output never carries
 * duplicate `LYRICS` records alongside the synthesized one.
 *
 * @returns The filtered entry list, in source order.
 */
const filterPreservedEntries = ({ entries, overrideLyrics }: FilterArgs): VorbisCommentEntry[] => {
  if (!overrideLyrics) {
    return [...entries];
  }

  const dropKeys = new Set(MANAGED_LYRICS_KEYS);
  return entries.filter((entry) => !dropKeys.has(entry.key.toUpperCase()));
};

/** Build a `LYRICS` entry from {@link WriteOptions.lyrics}, when one was supplied. */
const synthesizeLyricsEntries = (lyrics: WriteOptions["lyrics"]): VorbisCommentEntry[] => {
  if (lyrics === undefined) {
    return [];
  }

  const entry = lyricsToVorbisComment(lyrics);
  return entry === undefined ? [] : [entry];
};

/** Arguments for {@link pickPictures}. */
type PicturesArgs = {
  /** User-supplied write options. */
  options: WriteOptions;
  /** Pictures already present in the source file. */
  existing: readonly {
    pictureType: number;
    mimeType: string;
    description: string;
    width: number;
    height: number;
    colorDepth: number;
    colorNum: number;
    data: Uint8Array;
  }[];
};

/**
 * Decide which picture list lands in the rebuilt FLAC file:
 * - When `options.pictures` is set the new list wins outright.
 * - Otherwise the existing FLAC `PICTURE` blocks pass through verbatim so a
 *   tag-only edit doesn't strip the cover art.
 *
 * @returns The pictures to embed in the rebuilt FLAC file.
 */
const pickPictures = ({ options, existing }: PicturesArgs): readonly FlacWritablePicture[] => {
  if (options.pictures !== undefined) {
    return options.pictures.map(toFlacWritablePicture);
  }

  return existing.map((picture) => ({
    pictureType: picture.pictureType,
    mimeType: picture.mimeType,
    description: picture.description,
    width: picture.width,
    height: picture.height,
    colorDepth: picture.colorDepth,
    colorNum: picture.colorNum,
    data: picture.data,
  }));
};

/** Lift a public {@link PictureInfo} into the FLAC writer's expected shape. */
const toFlacWritablePicture = (picture: PictureInfo): FlacWritablePicture => ({
  pictureType: picture.kind ?? PictureKind.Other,
  mimeType: picture.mimeType,
  description: picture.description,
  data: picture.data,
});
