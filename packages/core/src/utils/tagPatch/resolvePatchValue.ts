import { hasTagValue } from "./hasTagValue.js";

/**
 * Resolve the final value of one field from a {@link TagPatch} entry and the
 * value currently stored in the file.
 *
 * - `patch === undefined` → keep `existing`.
 * - `patch` is `null` / `""` → the field is deleted (`undefined`).
 * - otherwise → `patch` wins.
 *
 * @param patch - The caller-supplied `TagPatch` field value.
 * @param existing - The value currently stored in the file, if any.
 * @returns The value to write, or `undefined` when the field should be absent.
 */
export const resolvePatchValue = <T extends string | number>(
  patch: T | null | undefined,
  existing: T | undefined,
): T | undefined => {
  if (patch === undefined) {
    return existing;
  }

  return hasTagValue(patch) ? patch : undefined;
};
