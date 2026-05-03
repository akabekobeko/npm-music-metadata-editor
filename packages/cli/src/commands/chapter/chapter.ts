import { Command } from "commander";
import type { CliContext } from "../../types.js";
import { type ClearChapterResult, clearChapter } from "./clearChapter.js";
import { type ListChapterResult, listChapter } from "./listChapter.js";
import { type SetChapterResult, setChapter } from "./setChapter.js";

/**
 * Pump a subcommand result onto `process.stdout` / `process.stderr`.
 *
 * Mirrors the helper used by `mme write` and `mme picture`: stderr is only
 * touched when the result has something to say so empty status lines do not
 * leak into pipelines.
 *
 * @param result - The subcommand outcome.
 */
const pump = (result: ListChapterResult | SetChapterResult | ClearChapterResult): void => {
  if (result.stdout !== "") {
    process.stdout.write(result.stdout);
  }

  if (result.stderr !== "") {
    process.stderr.write(result.stderr);
  }
};

/** Raw commander options for `mme chapter list`. */
type ListRawOptions = {
  readonly pretty?: boolean;
};

/** Raw commander options for `mme chapter set`. */
type SetRawOptions = {
  readonly json: string;
};

/**
 * Build the `mme chapter` subcommand tree (`list` / `set` / `clear`).
 *
 * @param context - Side-channel context (currently the stdin iterable).
 * @returns A configured commander `Command`.
 */
export const createChapterCommand = (context: CliContext): Command => {
  const command = new Command("chapter").description("Manage chapter marks");

  command
    .command("list")
    .description("List chapter marks (JSON by default; --pretty for a table)")
    .argument("<file>", "input audio file")
    .option("--pretty", "render a human-readable table")
    .action(async (file: string, opts: ListRawOptions) => {
      const result = await listChapter({ file, pretty: opts.pretty === true });
      pump(result);
    });

  command
    .command("set")
    .description("Replace the chapter list from a JSON document")
    .argument("<file>", "input audio file")
    .requiredOption("--json <path>", "JSON file with ChapterInfo[] (`-` reads from stdin)")
    .action(async (file: string, opts: SetRawOptions) => {
      const result = await setChapter({ file, json: opts.json, stdin: context.stdin });
      pump(result);
    });

  command
    .command("clear")
    .description("Remove every chapter mark")
    .argument("<file>", "input audio file")
    .action(async (file: string) => {
      const result = await clearChapter({ file });
      pump(result);
    });

  return command;
};
