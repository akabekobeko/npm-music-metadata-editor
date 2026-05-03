import { Command } from "commander";
import { writeStderr } from "../../output/writeStderr.js";
import type { CliContext } from "../../types.js";
import { handleWrite } from "./handleWrite.js";
import { parseWriteOptions } from "./parseWriteOptions.js";
import {
  FLOAT01_TAG_FIELDS,
  INTEGER_TAG_FIELDS,
  STRING_TAG_FIELDS,
  type WriteCliRawOptions,
} from "./types.js";

/**
 * Convert a camelCase `TagData` key into the kebab-case CLI flag name.
 *
 * Used purely to label commander options consistently with the documented
 * flag table — commander itself converts the kebab name back to camelCase
 * when populating the raw options bag.
 *
 * @param key - camelCase identifier (e.g. `albumArtist`).
 * @returns The kebab-case form (e.g. `album-artist`).
 */
const kebab = (key: string): string => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Append every tag-value flag (string / integer / float) to a commander
 * command instance.
 *
 * The tag-flag table is large enough that listing each `.option(...)` call
 * by hand would dwarf the rest of the file; building them from the typed
 * field tables keeps the CLI surface in sync with `TagData` mechanically.
 *
 * @param command - Commander instance to extend.
 * @returns The same command for fluent chaining.
 */
const registerTagValueFlags = (command: Command): Command => {
  STRING_TAG_FIELDS.forEach((key) => {
    command.option(`--${kebab(key)} <s>`, `set ${key}`);
  });

  INTEGER_TAG_FIELDS.forEach((key) => {
    command.option(`--${kebab(key)} <n>`, `set ${key} (integer)`);
  });

  FLOAT01_TAG_FIELDS.forEach((key) => {
    command.option(`--${kebab(key)} <n>`, `set ${key} (float in [0, 1])`);
  });

  return command;
};

/**
 * Build the `mme write` subcommand wired to `saveTrack` / `writeMetadata`.
 *
 * Mirrors the shape of `createReadCommand`: all flag wiring lives here, the
 * action body just translates commander's raw bag into a validated options
 * object and pumps the handler's buffers to `process.stdout` /
 * `process.stderr`.
 *
 * @param context - Side-channel context (currently the stdin iterable).
 * @returns A configured commander `Command`.
 */
export const createWriteCommand = (context: CliContext): Command => {
  const command = new Command("write")
    .description("Write metadata to a file or stdout")
    .argument("[file]", "input audio file (omit when using --stdin)");

  registerTagValueFlags(command);

  command
    .option("--track <spec>", 'set trackNumber (and trackTotal): "<n>" or "<n>/<total>"')
    .option("--disc <spec>", 'set discNumber (and discTotal): "<n>" or "<n>/<total>"')
    .option(
      "--clear <field>",
      'clear named field(s) — comma-separated list, repeatable, or "all"',
      (value: string, prev: readonly string[] = []) => [...prev, value],
      [] as readonly string[],
    )
    .option("--json <json>", "bulk-set tag fields from a JSON object")
    .option("--tag-file <path>", "read tag fields from a JSON file (`-` for stdin)")
    .option("--output <path>", "write to a different path (`-` writes bytes to stdout)")
    .option("--dry-run", "render the post-edit Track as JSON without touching the filesystem")
    .option("--no-atomic", "disable rename-based atomic write (file mode default is on)")
    .option("--stdin", "read bytes from stdin instead of a file argument")
    .option("--format <fmt>", "force the audio format (required with --stdin)")
    .action(async (file: string | undefined, raw: WriteCliRawOptions) => {
      const options = parseWriteOptions({ file, opts: raw });
      const result = await handleWrite({ options, raw, context });
      if (result.stdoutBytes !== undefined) {
        process.stdout.write(result.stdoutBytes);
      } else if (result.stdout !== "") {
        process.stdout.write(result.stdout);
      }

      writeStderr(result.stderr);
    });

  command.addHelpText(
    "after",
    [
      "",
      "Examples:",
      "  $ mme write song.mp3 --title 'Hello' --artist 'World'",
      '  $ mme write song.mp3 --json \'{"album":"OST"}\'',
      "  $ mme write song.mp3 --clear comment --clear lyrics",
      "  $ cat song.mp3 | mme write --stdin --format mp3 --title 'X' --output -",
    ].join("\n"),
  );

  return command;
};
