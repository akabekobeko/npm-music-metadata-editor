import type { TextEncoding } from "../../../utils/encoding/types.js";
import {
  INVOLVED_PEOPLE_FRAME_IDS,
  INVOLVED_PEOPLE_ROLE_PRODUCER,
} from "../involvedPeople/constants.js";
import { parseInvolvedPeopleFrame } from "../involvedPeople/parseInvolvedPeopleFrame.js";
import { replaceInvolvedPeopleRole } from "../involvedPeople/replaceInvolvedPeopleRole.js";
import type { Id3v2Frame } from "../types.js";
import { buildTextFrame } from "./buildTextFrame.js";

/** Arguments for {@link mergeProducerFrame}. */
type Args = {
  /** `tag.producer` value. `undefined` leaves existing frames untouched; `""` removes the role. */
  producer: string | undefined;
  /** Target ID3v2 major version (`4` emits `TIPL`, `3` emits `IPLS`). */
  majorVersion: 3 | 4;
  /** Frames the caller intends to preserve verbatim (may include `TIPL` / `IPLS`). */
  preserveFrames: readonly Id3v2Frame[];
};

/** Result of {@link mergeProducerFrame}. */
type Result = {
  /** The synthesized involved-people frame, or `undefined` when none is needed. */
  frame: Id3v2Frame | undefined;
  /** `preserveFrames` with any consumed involved-people frames removed. */
  preserveFrames: readonly Id3v2Frame[];
};

/**
 * Fold `tag.producer` into an involved-people frame (`TIPL` / `IPLS`).
 *
 * The producer is not a standalone text frame: it lives as a role/name pair
 * inside the involved-people list, alongside roles this library does not
 * model (engineer, mixer, ...). When the caller sets `producer`, the existing
 * involved-people frames are decoded, the producer entries are replaced (or
 * removed for `""`), and a single fresh frame is emitted — other roles ride
 * along unchanged. When `producer` is `undefined`, the existing frames stay
 * in `preserveFrames` verbatim.
 *
 * @returns The frame to emit (if any) plus the remaining preserved frames.
 */
export const mergeProducerFrame = ({ producer, majorVersion, preserveFrames }: Args): Result => {
  if (producer === undefined) {
    return { frame: undefined, preserveFrames };
  }

  const existing = preserveFrames.filter((frame) => INVOLVED_PEOPLE_FRAME_IDS.has(frame.id));
  const rest = preserveFrames.filter((frame) => !INVOLVED_PEOPLE_FRAME_IDS.has(frame.id));
  const values = existing.flatMap((frame) => parseInvolvedPeopleFrame(frame.data));
  const merged = replaceInvolvedPeopleRole({
    values,
    role: INVOLVED_PEOPLE_ROLE_PRODUCER,
    name: producer,
  });
  if (merged.length === 0) {
    return { frame: undefined, preserveFrames: rest };
  }

  const encoding: TextEncoding = majorVersion === 4 ? "utf8" : "latin1";
  const frame = buildTextFrame({
    id: majorVersion === 4 ? "TIPL" : "IPLS",
    text: merged.join("\u0000"),
    encoding,
  });
  return { frame, preserveFrames: rest };
};
