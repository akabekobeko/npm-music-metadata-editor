/**
 * Report whether a {@link TagPatch} value is an explicit deletion marker.
 *
 * Only `null` and `""` count; `undefined` means "preserve the existing
 * value" and therefore returns `false`.
 *
 * @param value - The raw `TagPatch` field value.
 * @returns `true` when the caller asked to remove the field.
 */
export const isClearedValue = (value: string | number | null | undefined): value is null | "" =>
  value === null || value === "";
