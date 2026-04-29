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
 * Options accepted by `readMetadata`.
 *
 * Reserved for future use; no options are honoured in Phase 1.
 */
export type ReadOptions = {
  /**
   * Override format detection (skip auto-detection and read as the given format).
   * Useful when the input has no extension or an ambiguous signature.
   */
  format?: AudioFormat;
};

/**
 * Options accepted by `writeMetadata`.
 *
 * `tag` is required because writing always needs at least one field to merge in.
 */
export type WriteOptions = {
  /** Metadata fields to merge into the file. Fields left `undefined` are preserved as-is. */
  tag: Partial<TagData>;
  /** Override format detection (write as the given format). */
  format?: AudioFormat;
};

/**
 * Result of reading metadata from an audio source.
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
};
