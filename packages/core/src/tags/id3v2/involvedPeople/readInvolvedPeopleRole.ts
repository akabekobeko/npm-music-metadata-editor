/**
 * Find the person name registered under `role` in an involved-people list.
 *
 * The list alternates role and name (`[role, name, role, name, ...]`); the
 * role comparison is case-insensitive. A trailing unpaired value is ignored.
 *
 * @param values - Decoded involved-people strings in frame order.
 * @param role - Role label to look up (e.g. `"producer"`).
 * @returns The first non-empty name registered under `role`, or `undefined`.
 */
export const readInvolvedPeopleRole = (
  values: readonly string[],
  role: string,
): string | undefined => {
  const wanted = role.toLowerCase();
  for (let i = 0; i + 1 < values.length; i += 2) {
    if ((values[i] as string).toLowerCase() !== wanted) {
      continue;
    }

    const name = values[i + 1] as string;
    if (name !== "") {
      return name;
    }
  }

  return undefined;
};
