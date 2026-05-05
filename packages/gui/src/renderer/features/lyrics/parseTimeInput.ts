/**
 * Parse a `mm:ss(.SSS)?` string typed into the synchronized-tab time cell.
 *
 * Returns `null` for unparseable inputs so the caller can flag the row as
 * invalid without crashing the form. Seconds and milliseconds are clamped to
 * the natural ranges `[0, 59]` / `[0, 999]`; minutes are unconstrained on
 * the high end so very long files (podcast chapter timestamps) can be
 * represented.
 *
 * @param input - Raw time text (`"01:23.500"`, `"01:23"`, `"83.500"`).
 * @returns Time offset in milliseconds, or `null` on parse failure.
 */
export const parseTimeInput = (input: string): number | null => {
  const trimmed = input.trim();
  if (trimmed === "") {
    return null;
  }

  const colonMatch = /^(\d+):(\d{1,2})(?:[.:](\d{1,3}))?$/.exec(trimmed);
  if (colonMatch !== null) {
    const minutes = Number.parseInt(colonMatch[1] ?? "0", 10);
    const seconds = Number.parseInt(colonMatch[2] ?? "0", 10);
    if (seconds > 59) {
      return null;
    }

    const fraction = colonMatch[3] ?? "";
    const ms = fraction === "" ? 0 : Number.parseInt(`${fraction}000`.slice(0, 3), 10);
    return minutes * 60_000 + seconds * 1_000 + ms;
  }

  const plain = /^(\d+)(?:[.:](\d{1,3}))?$/.exec(trimmed);
  if (plain !== null) {
    const seconds = Number.parseInt(plain[1] ?? "0", 10);
    const fraction = plain[2] ?? "";
    const ms = fraction === "" ? 0 : Number.parseInt(`${fraction}000`.slice(0, 3), 10);
    return seconds * 1_000 + ms;
  }

  return null;
};

/**
 * Format a millisecond offset as `mm:ss.SSS` for display in the synchronized
 * tab's editable cells.
 *
 * @param timeMs - Offset in milliseconds.
 * @returns A `mm:ss.SSS` string.
 */
export const formatTimeInput = (timeMs: number): string => {
  const total = Math.max(0, Math.round(timeMs));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1_000);
  const ms = total % 1_000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
};
