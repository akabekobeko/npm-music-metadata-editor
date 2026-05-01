/**
 * Container + codec identifier of an audio file.
 *
 * The list grows in subsequent phases as additional formats become supported.
 */
export type AudioFormat =
  | "mp3"
  | "flac"
  | "mp4"
  | "m4a"
  | "ogg"
  | "opus"
  | "wav"
  | "aiff"
  | "wma"
  | "ape";

/**
 * Common metadata fields populated from any tag format.
 *
 * Every field is optional because different tag formats expose different subsets
 * of metadata. Numeric fields use `number` when the value is naturally numeric
 * (track / disc / year / bpm) and `string` for free-form values.
 */
export type TagData = {
  /** Track / song title. */
  title?: string;
  /** Primary performing artist. */
  artist?: string;
  /** Album title. */
  album?: string;
  /** Album artist (the artist credited for the album as a whole). */
  albumArtist?: string;
  /** Composer of the work. */
  composer?: string;
  /** Conductor of the recording. */
  conductor?: string;
  /** Lyricist / text writer. */
  lyricist?: string;
  /** Publisher / record label. */
  publisher?: string;
  /** Copyright statement. */
  copyright?: string;
  /** Free-form comment. */
  comment?: string;
  /** Genre as a free-form string (resolved name, not a numeric ID). */
  genre?: string;
  /** Group / work / content group description. */
  group?: string;
  /** Long description / podcast description. */
  description?: string;
  /** ISO-639 language code (e.g. `"eng"`). */
  language?: string;
  /** International Standard Recording Code. */
  isrc?: string;
  /** Catalog or product identifier. */
  productId?: string;
  /** Recording year (4 digits). */
  year?: number;
  /** Recording date as ISO-8601 (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`). */
  recordingDate?: string;
  /** Original release date as ISO-8601. */
  originalReleaseDate?: string;
  /** Publishing date as ISO-8601. */
  publishingDate?: string;
  /** Track number within the album (1-based). */
  trackNumber?: number;
  /** Total number of tracks on the album. */
  trackTotal?: number;
  /** Disc number within a multi-disc set (1-based). */
  discNumber?: number;
  /** Total number of discs in the set. */
  discTotal?: number;
  /** Beats per minute. */
  bpm?: number;
  /** Rating value normalized to `[0, 1]`. Format-specific scales are mapped on read/write. */
  rating?: number;
};

/**
 * Picture type catalogue, mirroring the ID3v2 APIC field but reused across tag formats.
 *
 * Numeric values are stable and chosen to match ID3v2 picture types where applicable so
 * that round-tripping between formats does not lose semantic intent.
 */
export const PictureKind = {
  /** Other / unspecified. */
  Other: 0,
  /** 32x32 pixel file icon (PNG only, per ID3v2 spec). */
  Icon: 1,
  /** Other file icon. */
  OtherIcon: 2,
  /** Cover (front). */
  CoverFront: 3,
  /** Cover (back). */
  CoverBack: 4,
  /** Leaflet page. */
  Leaflet: 5,
  /** Media (e.g. label side of CD). */
  Media: 6,
  /** Lead artist / lead performer / soloist. */
  LeadArtist: 7,
  /** Artist / performer. */
  Artist: 8,
  /** Conductor. */
  Conductor: 9,
  /** Band / orchestra. */
  Band: 10,
  /** Composer. */
  Composer: 11,
  /** Lyricist / text writer. */
  Lyricist: 12,
  /** Recording location. */
  RecordingLocation: 13,
  /** During recording. */
  DuringRecording: 14,
  /** During performance. */
  DuringPerformance: 15,
  /** Movie / video screen capture. */
  ScreenCapture: 16,
  /** A bright colored fish (per the ID3v2 spec — kept for completeness). */
  BrightColoredFish: 17,
  /** Illustration. */
  Illustration: 18,
  /** Band / artist logotype. */
  BandLogo: 19,
  /** Publisher / studio logotype. */
  PublisherLogo: 20,
} as const;

/** Picture kind value drawn from {@link PictureKind}. */
export type PictureKindValue = (typeof PictureKind)[keyof typeof PictureKind];

/**
 * Embedded picture (cover art, etc.) attached to a tag.
 */
export type PictureInfo = {
  /** MIME type of the picture (`"image/jpeg"`, `"image/png"`, ...). */
  mimeType: string;
  /** Picture role / kind. */
  kind: PictureKindValue;
  /** Free-form description (often empty). */
  description?: string;
  /** Raw image bytes. */
  data: Uint8Array;
};

/**
 * A single chapter mark within an audio file.
 *
 * Times are expressed in milliseconds from the start of the file.
 */
export type ChapterInfo = {
  /** Chapter element identifier (unique within the file). */
  id: string;
  /** Start offset in milliseconds. */
  startMs: number;
  /** End offset in milliseconds (exclusive). */
  endMs: number;
  /** Display title for the chapter. */
  title?: string;
  /** Optional URL associated with the chapter. */
  url?: string;
  /** Optional picture associated with the chapter. */
  picture?: PictureInfo;
  /**
   * Nested chapters projected from an ID3v2 `CTOC` table-of-contents frame.
   * Present only when the source described a hierarchy (otherwise the file's
   * chapters appear as a flat list at the top level).
   */
  subChapters?: readonly ChapterInfo[];
};

/**
 * One synchronized lyric line, anchored to a millisecond timestamp.
 */
export type SynchronizedLyric = {
  /** Time offset from the start of the track, in milliseconds. */
  timeMs: number;
  /** Lyric text shown at this time offset. */
  text: string;
};

/**
 * Lyrics extracted from a tag.
 *
 * `unsynchronized` is the plain-text fallback. `synchronized` holds time-anchored
 * lines when the source format supports them (e.g. ID3v2 SYLT, LRC).
 */
export type LyricsInfo = {
  /** ISO-639 language code (e.g. `"eng"`). Optional. */
  language?: string;
  /** Free-form description (e.g. `"Lyrics"`). Optional. */
  description?: string;
  /** Plain (unsynchronized) lyrics text. */
  unsynchronized?: string;
  /** Synchronized lyric lines, sorted by `timeMs` ascending. */
  synchronized?: readonly SynchronizedLyric[];
};

/**
 * Tag flavours that can coexist inside a single MP3 file.
 *
 * Used by {@link ReadOptions.tagPriority} to decide which tag wins when
 * multiple are present. The default order matches ATL.NET: ID3v2 → APE →
 * ID3v1.
 */
export type TagSource = "id3v2" | "ape" | "id3v1";

/**
 * Options accepted by `readMetadata`.
 */
export type ReadOptions = {
  /**
   * Override format detection (skip auto-detection and read as the given format).
   * Useful when the input has no extension or an ambiguous signature.
   */
  format?: AudioFormat;
  /**
   * Order of tag sources to consult when several coexist (currently only MP3
   * exposes more than one). Earlier entries win on field conflicts; later
   * entries fill in fields the higher-priority sources left blank. Sources
   * not listed here are skipped entirely.
   *
   * Default: `["id3v2", "ape", "id3v1"]` — same order as ATL.NET.
   */
  tagPriority?: readonly TagSource[];
};

/**
 * Options accepted by `writeMetadata`.
 *
 * `tag` is required because writing always needs at least one field to merge in.
 */
export type WriteOptions = {
  /** Metadata fields to merge into the file. Fields left `undefined` are preserved as-is. */
  tag: Partial<TagData>;
  /**
   * Embedded pictures to write. When omitted the existing pictures are
   * preserved; when present (even an empty array), the existing pictures are
   * replaced wholesale.
   */
  pictures?: readonly PictureInfo[];
  /**
   * Chapters to write. When omitted the existing chapters are preserved; when
   * present, the existing chapters are replaced wholesale.
   */
  chapters?: readonly ChapterInfo[];
  /**
   * Lyrics to write. When omitted the existing lyrics are preserved; when
   * present, the existing lyrics are replaced wholesale.
   */
  lyrics?: LyricsInfo;
  /** Override format detection (write as the given format). */
  format?: AudioFormat;
};

/**
 * Severity level of a {@link Warning} surfaced during a read.
 *
 * `info` is the lowest level (e.g. an unrecognized but harmless field); `warn`
 * indicates partial loss (e.g. a malformed frame skipped); `error` is reserved
 * for situations where the read still succeeded but a key structure was broken.
 */
export type WarningSeverity = "info" | "warn" | "error";

/**
 * Non-fatal diagnostic produced during a read.
 *
 * Format readers attach warnings instead of throwing when a single sub-structure
 * is malformed but the rest of the file can still be parsed. Callers can inspect
 * `warnings` on {@link MetadataReadResult} / {@link Track} for partial-failure
 * triage without losing the data that *was* recoverable.
 */
export type Warning = {
  /** Severity tier. */
  severity: WarningSeverity;
  /** Human-readable message describing what was skipped or coerced. */
  message: string;
  /** Optional structured code (e.g. `"id3v2-bad-frame"`) for programmatic handling. */
  code?: string;
};

/**
 * Result of reading metadata from an audio source.
 *
 * The optional `warnings` / `additionalFields` / `durationMs` fields are populated
 * by readers as they support them; older readers may leave them `undefined`.
 * The high-level {@link Track} surface normalizes the absence to empty values.
 */
export type MetadataReadResult = {
  /** Detected container / codec. */
  audioFormat: AudioFormat;
  /** Common metadata fields. */
  tag: TagData;
  /** Embedded pictures (cover art, etc.). Empty array when none. */
  pictures: readonly PictureInfo[];
  /** Chapter marks. Empty array when none. */
  chapters: readonly ChapterInfo[];
  /** Lyrics, when the source contains any. */
  lyrics?: LyricsInfo;
  /** Audio duration in milliseconds, when the reader can determine it. */
  durationMs?: number;
  /**
   * Format-native fields that did not map to a {@link TagData} property.
   * Keys are reader-defined; values are stringified.
   */
  additionalFields?: Readonly<Record<string, string>>;
  /** Non-fatal diagnostics emitted during the read. */
  warnings?: readonly Warning[];
};

/**
 * High-level immutable view of a track's metadata.
 *
 * `Track` aggregates the output of {@link MetadataReadResult} into a stable
 * shape that the public {@link loadTrack} / {@link saveTrack} pair operates on.
 * It is a Plain Object — edit by spreading (`{ ...track, tag: { ...track.tag,
 * title: "New" } }`) and pass back to `saveTrack`. There is no setter / writer
 * method by design.
 */
export type Track = {
  /** Detected container / codec. */
  readonly audioFormat: AudioFormat;
  /** Audio duration in milliseconds, when known. */
  readonly durationMs?: number;
  /** Common metadata fields. */
  readonly tag: TagData;
  /** Embedded pictures (cover art, etc.). */
  readonly pictures: readonly PictureInfo[];
  /** Chapter marks. */
  readonly chapters: readonly ChapterInfo[];
  /** Lyrics, when the source contains any. */
  readonly lyrics?: LyricsInfo;
  /** Format-native fields that did not map to a {@link TagData} property. */
  readonly additionalFields: Readonly<Record<string, string>>;
  /** Non-fatal diagnostics collected while loading the track. */
  readonly warnings: readonly Warning[];
};

/**
 * Options accepted by `saveTrack`.
 *
 * The track itself is a Plain Object detached from any underlying file; the
 * source bytes (or path) must be passed alongside so the writer can rebuild
 * the audio while preserving everything `Track` does not model.
 */
export type SaveTrackOptions = {
  /** Existing file path or in-memory bytes to merge the modified track into. */
  source: string | Uint8Array;
  /**
   * Destination file path. When omitted and `source` is a string, the source
   * path is reused (overwrite in place). When omitted and `source` is bytes,
   * the rebuilt bytes are returned to the caller instead of being written.
   */
  outputPath?: string;
};
