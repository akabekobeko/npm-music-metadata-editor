import { TRACK_SECTIONS } from "../types.js";

const TOP_LEVEL_FIELDS: ReadonlySet<string> = new Set<string>(TRACK_SECTIONS);

/**
 * Property names that must never be traversed during dot-path lookup.
 *
 * Even though `Track` is a Plain Object, a path like `__proto__.toString`
 * supplied via the CLI would reach `Object.prototype` and surface unrelated
 * runtime values; refusing them keeps the lookup table-driven.
 */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Normalize a user-supplied dot path.
 *
 * The CLI accepts `tag.title`, `title` (interpreted as `tag.title`),
 * `audioFormat`, `pictures.0.kind`, etc. The first segment is checked
 * against the known top-level sections; anything else is assumed to live
 * under `tag.` and is auto-prefixed.
 *
 * @param path - Raw `--field` value.
 * @returns Path segments after normalisation. An empty array means the user
 *   passed an empty / dot-only path and the lookup should fail.
 */
const normalizePath = (path: string): readonly string[] => {
  const parts = path.split(".").filter((segment) => segment.length > 0);
  if (parts.length === 0) {
    return [];
  }

  const [head] = parts;
  if (head !== undefined && TOP_LEVEL_FIELDS.has(head)) {
    return parts;
  }

  return ["tag", ...parts];
};

/**
 * Resolve a dot-path against a root value, refusing prototype walks.
 *
 * `reduce` is used in place of a `for` loop because each step has a clean
 * functional shape and `undefined` propagates naturally for missing keys —
 * the early-exit case is "the next step has no object to descend into",
 * which the same predicate already covers.
 *
 * @param root - Value to traverse (typically the current `Track`).
 * @param path - Already-normalised path segments.
 * @returns The resolved value, or `undefined` when any segment is missing
 *   or forbidden.
 */
const traverse = (root: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>((current, segment) => {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }

    if (FORBIDDEN_KEYS.has(segment)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, root);

/**
 * Look up a value within a `Track` by user-supplied dot path.
 *
 * Returns `{ found: false }` when the path resolves to `undefined`; the
 * caller surfaces that as exit code `1`. The split discriminator is needed
 * because `undefined` is a perfectly legitimate field value (e.g. a tag
 * field that the source file did not populate).
 *
 * @param root - Track being queried.
 * @param path - Raw `--field` argument.
 * @returns A discriminated `{ found, value? }` pair.
 */
export const getField = (
  root: unknown,
  path: string,
): { readonly found: true; readonly value: unknown } | { readonly found: false } => {
  const segments = normalizePath(path);
  if (segments.length === 0) {
    return { found: false };
  }

  const value = traverse(root, segments);
  if (value === undefined) {
    return { found: false };
  }

  return { found: true, value };
};
