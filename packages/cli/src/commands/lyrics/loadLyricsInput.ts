import { readFile } from "node:fs/promises";
import { CommanderError } from "commander";
import { collectStdin } from "../read/collectStdin.js";

/** Source kind the user picked on the command line. */
export type LyricsInputKind = "text" | "lrc" | "json";

/** Arguments accepted by {@link loadLyricsInput}. */
type Args = {
  /** Discriminator selecting which input flag was used. */
  readonly kind: LyricsInputKind;
  /** Path supplied to `--text` / `--lrc` / `--json`; `-` reads from stdin. */
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
 * Resolve `--text` / `--lrc` / `--json` into a UTF-8 string.
 *
 * `path === "-"` drains the provided stdin iterable; any other value is
 * treated as a filesystem path. The returned string preserves the original
 * line endings so the caller (LRC parser, plain-text writer, JSON parser)
 * can decide how to normalise them.
 *
 * @returns The decoded text.
 * @throws {@link CommanderError} when the user passes `-` for more than one
 *   flag (the caller cannot demultiplex a single stdin into two payloads).
 */
export const loadLyricsInput = async (args: Args): Promise<string> => {
  if (args.path === "-") {
    const bytes = await collectStdin(args.stdin);
    if (bytes.byteLength === 0) {
      return usageError(`--${args.kind} -: no bytes received from stdin`);
    }

    return Buffer.from(bytes).toString("utf8");
  }

  const buffer = await readFile(args.path);
  return buffer.toString("utf8");
};
