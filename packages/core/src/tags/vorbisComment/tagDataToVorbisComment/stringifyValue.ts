/**
 * Stringify a {@link TagData} value for emission as a Vorbis Comment.
 *
 * @param value - The raw {@link TagData} value to render.
 * @returns A string representation, or `undefined` when the value should not
 *   be emitted (e.g. the field was set to `""` to clear it).
 */
export const stringifyValue = (value: string | number | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const text = typeof value === "string" ? value : String(value);
  return text === "" ? undefined : text;
};
