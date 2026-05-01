/**
 * Try to interpret one `©day` value (often `"YYYY"` or `"YYYY-MM-DD..."`) as
 * a 4-digit year for `tag.year`.
 *
 * @param value - The `©day` text value to parse.
 * @returns Parsed year, or `undefined` when the prefix isn't 4 digits.
 */
export const parseYearPrefix = (value: string): number | undefined => {
  const match = value.match(/^(\d{4})/);
  if (match === null) {
    return undefined;
  }

  const yearText = match[1];
  if (yearText === undefined) {
    return undefined;
  }

  const year = Number.parseInt(yearText, 10);
  return Number.isNaN(year) ? undefined : year;
};
