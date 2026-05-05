/**
 * Format a duration in milliseconds as `m:ss`, or `h:mm:ss` past one hour.
 *
 * Sub-second precision is dropped: 1500 ms renders as `0:01`. Used by the
 * `durationMs` cell so 1-hour-plus tracks gain a leading hours segment without
 * cluttering shorter ones.
 *
 * @param durationMs - Track length in milliseconds, or `undefined` when the
 *   reader could not determine it.
 * @returns Formatted string, or empty string when `durationMs` is `undefined`.
 */
export const formatDuration = (durationMs: number | undefined): string => {
  if (durationMs === undefined) {
    return "";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  }

  return `${minutes}:${pad2(seconds)}`;
};

/**
 * Left-pad a non-negative integer with a single leading zero when needed.
 *
 * @param value - Number to format. Expected to be in `0..99`.
 * @returns Two-digit zero-padded string.
 */
const pad2 = (value: number): string => String(value).padStart(2, "0");
