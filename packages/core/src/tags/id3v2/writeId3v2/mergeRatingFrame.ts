import { encodePopmRating } from "../../../utils/rating/encodePopmRating.js";
import { hasTagValue } from "../../../utils/tagPatch/hasTagValue.js";
import { buildPopularimeterFrameBody } from "../popularimeter/buildPopularimeterFrameBody.js";
import {
  POPM_DEFAULT_COUNTER,
  POPM_DEFAULT_EMAIL,
  POPM_FRAME_ID,
} from "../popularimeter/constants.js";
import { parsePopularimeterFrame } from "../popularimeter/parsePopularimeterFrame.js";
import type { Id3v2Frame } from "../types.js";
import { NO_FRAME_FLAGS } from "./constants.js";

/** Arguments for {@link mergeRatingFrame}. */
type Args = {
  /** `tag.rating` value. `undefined` leaves existing frames untouched; `null` removes them. */
  rating: number | null | undefined;
  /** Frames the caller intends to preserve verbatim (may include `POPM`). */
  preserveFrames: readonly Id3v2Frame[];
};

/** Result of {@link mergeRatingFrame}. */
type Result = {
  /** The synthesized `POPM` frame, or `undefined` when none is needed. */
  frame: Id3v2Frame | undefined;
  /** `preserveFrames` with any consumed `POPM` frames removed. */
  preserveFrames: readonly Id3v2Frame[];
};

/**
 * Fold `tag.rating` into a `POPM` (popularimeter) frame.
 *
 * `POPM` carries more than the rating (an owner e-mail and a play counter),
 * so the frame is merged rather than rebuilt: when the caller sets `rating`,
 * the first existing `POPM` lends its e-mail and counter to the new frame
 * and every other `POPM` is dropped. Without an existing frame the default
 * e-mail / zero counter are used. `null` removes every `POPM`; `undefined`
 * keeps them all verbatim.
 *
 * @returns The frame to emit (if any) plus the remaining preserved frames.
 */
export const mergeRatingFrame = ({ rating, preserveFrames }: Args): Result => {
  if (rating === undefined) {
    return { frame: undefined, preserveFrames };
  }

  const existing = preserveFrames.filter((frame) => frame.id === POPM_FRAME_ID);
  const rest = preserveFrames.filter((frame) => frame.id !== POPM_FRAME_ID);
  if (!hasTagValue(rating)) {
    return { frame: undefined, preserveFrames: rest };
  }

  const first = existing[0] === undefined ? undefined : parsePopularimeterFrame(existing[0].data);
  const frame: Id3v2Frame = {
    id: POPM_FRAME_ID,
    flags: NO_FRAME_FLAGS,
    data: buildPopularimeterFrameBody({
      email: first?.email ?? POPM_DEFAULT_EMAIL,
      rating: encodePopmRating(rating),
      counter: first?.counter ?? POPM_DEFAULT_COUNTER,
    }),
  };
  return { frame, preserveFrames: rest };
};
