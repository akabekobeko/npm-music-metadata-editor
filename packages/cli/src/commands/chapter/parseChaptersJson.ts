import { readFile } from "node:fs/promises";
import type { ChapterInfo } from "@akabeko/music-metadata-editor";
import { CommanderError } from "commander";
import { collectStdin } from "../read/collectStdin.js";
import { validateChapters } from "./validateChapters.js";

/** Arguments accepted by {@link parseChaptersJson}. */
type Args = {
  /** `--json` value supplied by the user. `-` reads JSON from stdin. */
  readonly path: string;
  /** Stdin iterable used when `path === "-"`. */
  readonly stdin: AsyncIterable<Uint8Array>;
};

/**
 * Throw a commander usage error so the bin layer maps it to exit code `2`.
 *
 * @param message - User-facing error message.
 * @returns Never; always throws.
 */
const usageError = (message: string): never => {
  throw new CommanderError(2, "mme.usageError", message);
};

/**
 * Read the `--json <path>` payload, parse it, and validate it against the
 * `ChapterInfo[]` contract.
 *
 * Performs only structural / cross-element validation; the field-level
 * shape check is delegated to {@link validateChapters}, which throws the
 * same {@link CommanderError} flavour so the bin layer's exit-code mapping
 * stays consistent.
 *
 * @returns The validated chapter list.
 * @throws {@link CommanderError} on JSON / shape / invariant failures.
 */
export const parseChaptersJson = async (args: Args): Promise<readonly ChapterInfo[]> => {
  const text = args.path === "-" ? await readFromStdin(args.stdin) : await readFromPath(args.path);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return usageError(`--json: invalid JSON (${(error as Error).message})`);
  }

  if (!Array.isArray(parsed)) {
    return usageError("--json: expected a JSON array of ChapterInfo objects");
  }

  parsed.forEach((entry, i) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      usageError(`--json: chapters[${i}] must be a JSON object`);
    }
  });

  const chapters = parsed as readonly ChapterInfo[];
  validateChapters(chapters);
  return chapters;
};

/**
 * Drain stdin and decode the bytes as UTF-8.
 *
 * @param stdin - Async iterable yielding stdin chunks.
 * @returns The decoded text.
 */
const readFromStdin = async (stdin: AsyncIterable<Uint8Array>): Promise<string> => {
  const bytes = await collectStdin(stdin);
  return Buffer.from(bytes).toString("utf8");
};

/**
 * Read a JSON file from disk and decode the bytes as UTF-8.
 *
 * @param path - Filesystem path.
 * @returns The decoded text.
 */
const readFromPath = async (path: string): Promise<string> => {
  const bytes = await readFile(path);
  return bytes.toString("utf8");
};
