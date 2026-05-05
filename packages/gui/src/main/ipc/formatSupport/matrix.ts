import type { AudioFormat, TagData } from "@akabeko/music-metadata-editor";
import type { FormatSupportEntry } from "../../../shared/ipc-contract.js";

/**
 * Common `TagData` keys shared by every {@link AudioFormat} this package supports.
 *
 * Listed once and reused across every entry in {@link buildFormatSupportMatrix}
 * because every container we emit (ID3v2, APE, Vorbis Comment, iTunes atoms,
 * ASF) maps the standard set of textual fields. Format-specific gaps are
 * applied by overriding individual entries below.
 */
const COMMON_TAG_FIELDS: ReadonlyArray<keyof TagData> = [
  "title",
  "artist",
  "album",
  "albumArtist",
  "composer",
  "conductor",
  "lyricist",
  "publisher",
  "copyright",
  "comment",
  "genre",
  "group",
  "description",
  "language",
  "isrc",
  "productId",
  "year",
  "recordingDate",
  "originalReleaseDate",
  "publishingDate",
  "trackNumber",
  "trackTotal",
  "discNumber",
  "discTotal",
  "bpm",
  "rating",
];

/**
 * Per-format capability flags.
 *
 * `pictures` / `chapters` / `lyrics` are the binary toggles consumed by the
 * matrix. `tagFields` lets a format opt out of fields the COMMON list assumes
 * — currently only used to drop fields that have no idiomatic mapping in a
 * given container.
 */
type FormatCapability = {
  readonly pictures: boolean;
  readonly chapters: boolean;
  readonly lyrics: boolean;
  /** When set, replaces {@link COMMON_TAG_FIELDS} for this format. */
  readonly tagFields?: ReadonlyArray<keyof TagData>;
};

/**
 * Capability table indexed by {@link AudioFormat}.
 *
 * The values reflect what `@akabeko/music-metadata-editor` core writes today.
 * Snapshot tests in `matrix.test.ts` pin the resolved matrix so any divergence
 * with a future core release surfaces as a visible diff.
 */
const CAPABILITIES: Readonly<Record<AudioFormat, FormatCapability>> = {
  mp3: { pictures: true, chapters: true, lyrics: true },
  flac: { pictures: true, chapters: false, lyrics: true },
  mp4: { pictures: true, chapters: true, lyrics: true },
  m4a: { pictures: true, chapters: true, lyrics: true },
  ogg: { pictures: true, chapters: false, lyrics: true },
  opus: { pictures: true, chapters: false, lyrics: true },
  wav: { pictures: true, chapters: true, lyrics: true },
  aiff: { pictures: true, chapters: true, lyrics: true },
  wma: { pictures: true, chapters: false, lyrics: true },
  ape: { pictures: true, chapters: false, lyrics: true },
};

/**
 * Static {@link AudioFormat} ordering for {@link buildFormatSupportMatrix}.
 *
 * Keeping the order stable in source means the snapshot test does not flap on
 * `Object.keys` iteration order.
 */
const FORMAT_ORDER: readonly AudioFormat[] = [
  "mp3",
  "flac",
  "mp4",
  "m4a",
  "ogg",
  "opus",
  "wav",
  "aiff",
  "wma",
  "ape",
];

/**
 * Materialise the format-support matrix consumed by `mme:formatSupport:list`.
 *
 * Pure function (no I/O, no `this`). The output is a fresh array on every call
 * so callers can safely mutate it without polluting the static tables.
 *
 * @returns One {@link FormatSupportEntry} per registered {@link AudioFormat},
 *   in the order defined by {@link FORMAT_ORDER}.
 */
export const buildFormatSupportMatrix = (): readonly FormatSupportEntry[] =>
  FORMAT_ORDER.map((format) => {
    const capability = CAPABILITIES[format];
    return {
      format,
      writableTagFields: capability.tagFields ?? COMMON_TAG_FIELDS,
      supportsPictures: capability.pictures,
      supportsChapters: capability.chapters,
      supportsLyrics: capability.lyrics,
    };
  });
