import type { Id3v2FrameFlags, Id3v2MajorVersion } from "../../types.js";

/** Arguments for {@link decodeFrameFlags}. */
type Args = {
  /** First flag byte (offset +8 within the frame header). */
  statusFlags: number;
  /** Second flag byte (offset +9 within the frame header). */
  formatFlags: number;
  /** ID3v2 major version (`3` and `4` differ in bit positions). */
  majorVersion: Id3v2MajorVersion;
};

/**
 * Decode the two flag bytes into the typed {@link Id3v2FrameFlags} record.
 *
 * @returns The decoded frame flags.
 */
export const decodeFrameFlags = ({
  statusFlags,
  formatFlags,
  majorVersion,
}: Args): Id3v2FrameFlags => {
  if (majorVersion === 4) {
    return {
      tagAlterPreservation: (statusFlags & 0x40) !== 0,
      fileAlterPreservation: (statusFlags & 0x20) !== 0,
      readOnly: (statusFlags & 0x10) !== 0,
      groupingIdentity: (formatFlags & 0x40) !== 0,
      compression: (formatFlags & 0x08) !== 0,
      encryption: (formatFlags & 0x04) !== 0,
      unsynchronization: (formatFlags & 0x02) !== 0,
      dataLengthIndicator: (formatFlags & 0x01) !== 0,
    };
  }

  // ID3v2.3 layout — bit positions differ from v2.4.
  return {
    tagAlterPreservation: (statusFlags & 0x80) !== 0,
    fileAlterPreservation: (statusFlags & 0x40) !== 0,
    readOnly: (statusFlags & 0x20) !== 0,
    groupingIdentity: (formatFlags & 0x20) !== 0,
    compression: (formatFlags & 0x80) !== 0,
    encryption: (formatFlags & 0x40) !== 0,
    unsynchronization: false,
    dataLengthIndicator: false,
  };
};
