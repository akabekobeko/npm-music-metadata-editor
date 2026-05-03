import { Command, CommanderError } from "commander";
import type { CliContext } from "../../types.js";
import { type ClearLyricsResult, clearLyrics } from "./clearLyrics.js";
import { type GetLyricsResult, getLyrics, type LyricsGetFormat } from "./getLyrics.js";
import { type SetLyricsResult, setLyrics } from "./setLyrics.js";

/** Allowed values for `mme lyrics get --format`. */
const VALID_GET_FORMATS: ReadonlySet<LyricsGetFormat> = new Set<LyricsGetFormat>([
  "text",
  "lrc",
  "json",
]);

/**
 * Validate a `--format` value against {@link VALID_GET_FORMATS}.
 *
 * Funneling the throw through commander's parser keeps the exit-code
 * mapping consistent with `--unknown-flag` (i.e. exit code 2).
 *
 * @param raw - Raw flag value.
 * @returns The validated format.
 */
const parseGetFormat = (raw: string): LyricsGetFormat => {
  if (!VALID_GET_FORMATS.has(raw as LyricsGetFormat)) {
    throw new CommanderError(
      2,
      "mme.usageError",
      `--format: unknown lyrics format "${raw}" (allowed: text, lrc, json)`,
    );
  }

  return raw as LyricsGetFormat;
};

/**
 * Pump a subcommand result onto `process.stdout` / `process.stderr`.
 *
 * @param result - The subcommand outcome.
 */
const pump = (result: GetLyricsResult | SetLyricsResult | ClearLyricsResult): void => {
  if (result.stdout !== "") {
    process.stdout.write(result.stdout);
  }

  if (result.stderr !== "") {
    process.stderr.write(result.stderr);
  }
};

/** Raw commander options for `mme lyrics get`. */
type GetRawOptions = {
  readonly format?: LyricsGetFormat;
  readonly language?: string;
};

/** Raw commander options for `mme lyrics set`. */
type SetRawOptions = {
  readonly text?: string;
  readonly lrc?: string;
  readonly json?: string;
  readonly language?: string;
  readonly description?: string;
};

/**
 * Resolve the mutually-exclusive `--text` / `--lrc` / `--json` selection
 * into a single discriminated source.
 *
 * @param opts - Raw `mme lyrics set` options bag.
 * @returns The chosen input kind and path, or a usage error when zero / two+
 *   flags were supplied.
 */
const resolveSetSource = (
  opts: SetRawOptions,
): { readonly kind: "text" | "lrc" | "json"; readonly path: string } => {
  const provided: { kind: "text" | "lrc" | "json"; path: string }[] = [];
  if (opts.text !== undefined) {
    provided.push({ kind: "text", path: opts.text });
  }

  if (opts.lrc !== undefined) {
    provided.push({ kind: "lrc", path: opts.lrc });
  }

  if (opts.json !== undefined) {
    provided.push({ kind: "json", path: opts.json });
  }

  if (provided.length === 0) {
    throw new CommanderError(
      2,
      "mme.usageError",
      "`mme lyrics set` requires one of --text, --lrc, --json",
    );
  }

  if (provided.length > 1) {
    throw new CommanderError(
      2,
      "mme.usageError",
      "--text, --lrc and --json are mutually exclusive",
    );
  }

  return provided[0] as { readonly kind: "text" | "lrc" | "json"; readonly path: string };
};

/**
 * Build the `mme lyrics` subcommand tree (`get` / `set` / `clear`).
 *
 * @param context - Side-channel context (currently the stdin iterable).
 * @returns A configured commander `Command`.
 */
export const createLyricsCommand = (context: CliContext): Command => {
  const command = new Command("lyrics").description("Manage embedded lyrics");

  command
    .command("get")
    .description("Read embedded lyrics in the requested format")
    .argument("<file>", "input audio file")
    .option(
      "--format <fmt>",
      "output format: text (default), lrc, or json",
      parseGetFormat,
      "text" as LyricsGetFormat,
    )
    .option("--language <iso>", "ISO-639 language hint to filter on")
    .action(async (file: string, opts: GetRawOptions) => {
      const result = await getLyrics({
        file,
        format: opts.format ?? "text",
        ...(opts.language === undefined ? {} : { language: opts.language }),
      });
      pump(result);
    });

  command
    .command("set")
    .description("Embed new lyrics into the file")
    .argument("<file>", "input audio file")
    .option("--text <path>", "plain-text lyrics file (`-` reads from stdin)")
    .option("--lrc <path>", "LRC lyrics file (`-` reads from stdin)")
    .option("--json <path>", "LyricsInfo JSON file (`-` reads from stdin)")
    .option("--language <iso>", "ISO-639 language hint")
    .option("--description <s>", "free-form description")
    .action(async (file: string, opts: SetRawOptions) => {
      const source = resolveSetSource(opts);
      const result = await setLyrics({
        file,
        kind: source.kind,
        path: source.path,
        ...(opts.language === undefined ? {} : { language: opts.language }),
        ...(opts.description === undefined ? {} : { description: opts.description }),
        stdin: context.stdin,
      });
      pump(result);
    });

  command
    .command("clear")
    .description("Remove embedded lyrics")
    .argument("<file>", "input audio file")
    .action(async (file: string) => {
      const result = await clearLyrics({ file });
      pump(result);
    });

  return command;
};
