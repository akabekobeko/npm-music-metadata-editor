/** Arguments for {@link replaceInvolvedPeopleRole}. */
type Args = {
  /** Decoded involved-people strings in frame order (`[role, name, ...]`). */
  values: readonly string[];
  /** Role label whose entries are replaced (matched case-insensitively). */
  role: string;
  /** New person name. An empty string removes the role without re-adding it. */
  name: string;
};

/**
 * Replace every entry registered under `role` with a single new pair.
 *
 * Entries under other roles are kept in order, so editing the producer does
 * not drop engineers / mixers stored in the same frame. A trailing unpaired
 * value is dropped.
 *
 * @returns The new value list. Empty when nothing remains (the caller should
 *   then omit the frame entirely).
 */
export const replaceInvolvedPeopleRole = ({ values, role, name }: Args): string[] => {
  const wanted = role.toLowerCase();
  const out: string[] = [];
  for (let i = 0; i + 1 < values.length; i += 2) {
    if ((values[i] as string).toLowerCase() === wanted) {
      continue;
    }

    out.push(values[i] as string, values[i + 1] as string);
  }

  if (name !== "") {
    out.push(role, name);
  }

  return out;
};
