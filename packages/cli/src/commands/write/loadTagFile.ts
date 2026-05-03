import { readFile } from "node:fs/promises";
import type { TagData } from "@akabeko/music-metadata-editor";
import { CommanderError } from "commander";
import { collectStdin } from "../read/collectStdin.js";
import { validateTagPayload } from "./parseTagOverrides.js";

/** Arguments accepted by {@link loadTagFile}. */
type Args = {
  /** `--tag-file` value (`undefined` when the flag was not used; `-` for stdin). */
  readonly path: string | undefined;
  /** Stdin iterable used when `path === "-"`. */
  readonly stdin: AsyncIterable<Uint8Array>;
};

/**
 * Resolve `--tag-file` into a `Partial<TagData>`.
 *
 * `path === undefined` short-circuits to `undefined`. `path === "-"` drains
 * the provided stdin iterable instead of touching disk; any other value is
 * treated as a filesystem path. The bytes are decoded as UTF-8 JSON and
 * validated via {@link validateTagPayload}.
 *
 * @returns The validated payload, or `undefined` when no flag was used.
 * @throws `CommanderError` (exit code 2) when the JSON is malformed or the
 *   payload fails schema validation. Other I/O errors propagate as-is.
 */
export const loadTagFile = async ({ path, stdin }: Args): Promise<Partial<TagData> | undefined> => {
  if (path === undefined) {
    return undefined;
  }

  const bytes = path === "-" ? await collectStdin(stdin) : await readFile(path);
  const text = Buffer.from(bytes).toString("utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new CommanderError(
      2,
      "mme.usageError",
      `--tag-file: invalid JSON (${(error as Error).message})`,
    );
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CommanderError(2, "mme.usageError", "--tag-file: expected a JSON object");
  }

  return validateTagPayload(parsed as Record<string, unknown>, "--tag-file");
};
