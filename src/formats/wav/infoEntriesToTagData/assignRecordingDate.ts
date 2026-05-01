import type { TagData } from "../../../types.js";

/** Match dates emitted as plain `YYYY` values (e.g. `"1985"`). */
const YEAR_ONLY = /^\d{4}$/;

/**
 * Project the recording date string from the `ICRD` INFO entry onto the
 * appropriate {@link TagData} slot.
 *
 * Bare `YYYY` values are stored as a number under `TagData.year`; anything
 * else (typically full ISO `YYYY-MM-DD`) is kept verbatim under
 * `TagData.recordingDate`. This split mirrors how the rest of the code base
 * surfaces year vs. precise dates.
 *
 * @param target - `TagData` mutated in place to receive the projected value.
 * @param value - Decoded INFO entry text.
 */
export const assignRecordingDate = (target: TagData, value: string): void => {
  if (YEAR_ONLY.test(value)) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      target.year = parsed;
    }

    return;
  }

  target.recordingDate = value;
};
