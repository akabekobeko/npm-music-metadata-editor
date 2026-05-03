import { ID3V2_TEXT_FRAME_MAP } from "../constants.js";
import type { Id3v2FrameFlags } from "../types.js";

/** Empty frame-flag set used by every writer-synthesized frame. */
export const NO_FRAME_FLAGS: Id3v2FrameFlags = {
  tagAlterPreservation: false,
  fileAlterPreservation: false,
  readOnly: false,
  groupingIdentity: false,
  compression: false,
  encryption: false,
  unsynchronization: false,
  dataLengthIndicator: false,
};

/** Reverse of {@link ID3V2_TEXT_FRAME_MAP}: `TagData` field → frame ID. */
export const TAG_FIELD_TO_FRAME_ID: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(ID3V2_TEXT_FRAME_MAP).map(([frameId, field]) => [field, frameId]),
);
