import path from "node:path";

/**
 * Strip a filesystem path down to the last segment.
 *
 * Thin wrapper over `path.basename` kept here so the menu builder doesn't
 * pull in `node:path` at the top level (Vitest stubs the import surface and
 * this module being importable from JSDOM tests matters).
 *
 * @param filePath - Absolute or relative path.
 * @returns The trailing segment, or the input unchanged when it has none.
 */
export const basename = (filePath: string): string => path.basename(filePath);
