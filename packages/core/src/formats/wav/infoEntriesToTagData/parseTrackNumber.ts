/**
 * Extract the leading integer of a `"X"` or `"X/Y"` style INFO track value.
 *
 * `LIST/INFO` writers store track numbers as plain text under codes like
 * `ITRK`, `IPRT`, `TRCK`, with the total optionally appended after a slash.
 * We project just the leading number onto `TagData.trackNumber`; the total
 * (`TagData.trackTotal`) is not surfaced from INFO entries because most
 * writers in the wild do not bother emitting it.
 *
 * @param value - Decoded INFO entry text.
 * @returns The parsed integer, or `undefined` when the leading token is
 *   blank or non-numeric.
 */
export const parseTrackNumber = (value: string): number | undefined => {
  const head = value.split("/")[0]?.trim();
  if (head === undefined || head === "") {
    return undefined;
  }

  const parsed = Number.parseInt(head, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};
