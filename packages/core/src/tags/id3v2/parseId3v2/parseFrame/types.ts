import type { Id3v2Frame, Id3v2MajorVersion } from "../../types.js";

/** Outcome of parsing one frame. */
export type ParseFrameResult =
  | { kind: "frame"; frame: Id3v2Frame; consumed: number }
  | { kind: "padding" }
  | { kind: "error"; consumed: number; reason: string };

/** Arguments for {@link parseFrame}. */
export type ParseFrameArgs = {
  /** Tag-body bytes (already de-unsynchronised at the tag level when applicable). */
  body: Uint8Array;
  /** Offset within `body` to start parsing. */
  offset: number;
  /** ID3v2 major version dictating header layout (3 / 4 bytes for ID, sync-safe size, flags). */
  majorVersion: Id3v2MajorVersion;
};

/** Empty frame-flag set, used for ID3v2.2 frames (which carry no flag bytes). */
export const NO_FLAGS = {
  tagAlterPreservation: false,
  fileAlterPreservation: false,
  readOnly: false,
  groupingIdentity: false,
  compression: false,
  encryption: false,
  unsynchronization: false,
  dataLengthIndicator: false,
} as const;
