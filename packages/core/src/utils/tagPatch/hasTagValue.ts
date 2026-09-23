/**
 * Report whether a {@link TagPatch} value carries an actual value to write.
 *
 * `undefined` (preserve), `null` (delete) and `""` (delete, string fields
 * only) all return `false`; anything else is a concrete value.
 *
 * @param value - The raw `TagPatch` field value.
 * @returns `true` when `value` should be written to the file.
 */
export const hasTagValue = <T extends string | number>(value: T | null | undefined): value is T =>
  value !== undefined && value !== null && value !== "";
