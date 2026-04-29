/**
 * Major version of an ID3v2 tag (`2`, `3`, or `4`).
 *
 * Phase 2 implements read for all three; write only emits `3` or `4`.
 */
export type Id3v2MajorVersion = 2 | 3 | 4;

/** Tag-level header flags decoded from byte 5 of the ID3v2 header. */
export type Id3v2HeaderFlags = {
  /** Tag-level unsynchronisation is in effect. */
  unsynchronization: boolean;
  /** An extended header follows (ID3v2.3+). */
  extendedHeader: boolean;
  /** Experimental indicator (ID3v2.3+). */
  experimental: boolean;
  /** A footer follows the frames (ID3v2.4+). */
  footer: boolean;
};

/** Frame-level flags decoded from the two trailing flag bytes (ID3v2.3+). */
export type Id3v2FrameFlags = {
  /** Frame should be discarded if the tag is altered. */
  tagAlterPreservation: boolean;
  /** Frame should be discarded if the file is altered. */
  fileAlterPreservation: boolean;
  /** Frame is read-only. */
  readOnly: boolean;
  /** Frame body is grouped with others sharing the same group identifier. */
  groupingIdentity: boolean;
  /** Frame body is compressed with zlib. */
  compression: boolean;
  /** Frame body is encrypted. */
  encryption: boolean;
  /** Frame body uses unsynchronisation independently from the tag header (ID3v2.4 only). */
  unsynchronization: boolean;
  /** A 4-byte data length indicator precedes the frame body (ID3v2.4 only). */
  dataLengthIndicator: boolean;
};

/**
 * One frame inside an ID3v2 tag.
 *
 * Phase 2 keeps every frame as raw post-decoded bytes: callers reach in via
 * helpers (text frames in `parseTextFrame`, comment frames in
 * `parseCommentFrame`, …) so the round-trip writer can re-emit unknown frame
 * IDs verbatim.
 */
export type Id3v2Frame = {
  /** 4-character frame ID for v2.3/v2.4, or 3 characters for v2.2. */
  id: string;
  /** Frame-level flags. v2.2 frames have no flags — every field is `false`. */
  flags: Id3v2FrameFlags;
  /** Decoded frame body (after unsync / unwrapping the data length indicator). */
  data: Uint8Array;
};

/** Parsed ID3v2 tag. */
export type Id3v2Tag = {
  /** Major version (`2`, `3`, or `4`). */
  majorVersion: Id3v2MajorVersion;
  /** Revision byte from the header (informational). */
  revision: number;
  /** Tag-level header flags. */
  flags: Id3v2HeaderFlags;
  /** Total tag size in bytes including the 10-byte header (and footer when present). */
  totalSize: number;
  /** Frames in file order. */
  frames: readonly Id3v2Frame[];
};
