import { Command, CommanderError } from "commander";
import { writeStderr } from "../../output/writeStderr.js";
import type { CliContext } from "../../types.js";
import { type ClearPictureResult, clearPicture } from "./clearPicture.js";
import { type ExtractPictureResult, extractPicture } from "./extractPicture.js";
import { type SetPictureResult, setPicture } from "./setPicture.js";

/**
 * Parse a `--index` flag value as a non-negative integer.
 *
 * Negative numbers / floats / non-numeric input fall through to a usage
 * error (exit code 2). The value is funneled through commander's argument
 * parser so the throw lands in the same translation pipeline as
 * `--unknown-flag`.
 *
 * @param raw - Raw flag value supplied by the user.
 * @returns The parsed integer.
 */
const parseIndex = (raw: string): number => {
  if (!/^\d+$/.test(raw)) {
    throw new CommanderError(
      2,
      "mme.usageError",
      `--index: expected a non-negative integer, got "${raw}"`,
    );
  }

  return Number.parseInt(raw, 10);
};

/**
 * Pump a subcommand result onto `process.stdout` / `process.stderr`.
 *
 * Mirrors the helper used by `mme write`: bytes win over text on stdout
 * (extracted picture bytes must not be UTF-8 decoded), and stderr is only
 * touched when the result has something to say.
 *
 * @param result - The subcommand outcome.
 */
const pump = (result: ExtractPictureResult | SetPictureResult | ClearPictureResult): void => {
  if ("stdoutBytes" in result && result.stdoutBytes !== undefined) {
    process.stdout.write(result.stdoutBytes);
  } else if (result.stdout !== "") {
    process.stdout.write(result.stdout);
  }

  writeStderr(result.stderr);
};

/** Raw commander options for `mme picture extract`. */
type ExtractRawOptions = {
  readonly output: string;
  readonly kind?: string;
  readonly index?: number;
  readonly autoExtension?: boolean;
};

/** Raw commander options for `mme picture set`. */
type SetRawOptions = {
  readonly input: string;
  readonly kind?: string;
  readonly mime?: string;
  readonly description?: string;
  readonly replace?: boolean;
};

/** Raw commander options for `mme picture clear`. */
type ClearRawOptions = {
  readonly kind?: string;
  readonly index?: number;
};

/**
 * Build the `mme picture` subcommand tree (`extract` / `set` / `clear`).
 *
 * Each verb is a `Command` attached underneath the `picture` parent so the
 * top-level program can wire it up via `program.addCommand(...)`. All
 * argument validation lives inside the per-verb handlers; this factory only
 * declares the flag surface.
 *
 * @param context - Side-channel context (currently the stdin iterable).
 * @returns A configured commander `Command`.
 */
export const createPictureCommand = (context: CliContext): Command => {
  const command = new Command("picture").description("Manage embedded pictures (cover art etc.)");

  command
    .command("extract")
    .description("Extract an embedded picture to a file or stdout")
    .argument("<file>", "input audio file")
    .requiredOption("--output <path>", "output path (`-` writes raw bytes to stdout)")
    .option("--kind <kind>", "filter by picture kind (e.g. cover-front)")
    .option("--index <n>", "0-based index within the matching subset", parseIndex)
    .option("--auto-extension", "append the inferred extension (.jpg / .png / ...)")
    .action(async (file: string, opts: ExtractRawOptions) => {
      const result = await extractPicture({
        file,
        output: opts.output,
        ...(opts.kind === undefined ? {} : { kind: opts.kind }),
        ...(opts.index === undefined ? {} : { index: opts.index }),
        autoExtension: opts.autoExtension === true,
      });
      pump(result);
    });

  command
    .command("set")
    .description("Embed a picture into the file")
    .argument("<file>", "input audio file")
    .requiredOption("--input <path>", "input image (`-` reads raw bytes from stdin)")
    .option("--kind <kind>", "picture kind (default: cover-front)")
    .option("--mime <mime>", "MIME type override (e.g. image/jpeg)")
    .option("--description <s>", "free-form description")
    .option(
      "--replace",
      "replace existing pictures (with --kind, only those matching the same kind)",
    )
    .action(async (file: string, opts: SetRawOptions) => {
      const result = await setPicture({
        file,
        input: opts.input,
        ...(opts.kind === undefined ? {} : { kind: opts.kind }),
        ...(opts.mime === undefined ? {} : { mime: opts.mime }),
        ...(opts.description === undefined ? {} : { description: opts.description }),
        replace: opts.replace === true,
        stdin: context.stdin,
      });
      pump(result);
    });

  command
    .command("clear")
    .description("Remove embedded pictures")
    .argument("<file>", "input audio file")
    .option("--kind <kind>", "scope removal to a kind")
    .option("--index <n>", "0-based index (within --kind subset, or absolute)", parseIndex)
    .action(async (file: string, opts: ClearRawOptions) => {
      const result = await clearPicture({
        file,
        ...(opts.kind === undefined ? {} : { kind: opts.kind }),
        ...(opts.index === undefined ? {} : { index: opts.index }),
      });
      pump(result);
    });

  command.addHelpText(
    "after",
    [
      "",
      "Examples:",
      "  $ mme picture extract song.mp3 --output cover.jpg",
      "  $ mme picture set song.mp3 --input cover.jpg --kind cover-front --replace",
      "  $ mme picture clear song.mp3 --kind cover-back",
    ].join("\n"),
  );

  return command;
};
