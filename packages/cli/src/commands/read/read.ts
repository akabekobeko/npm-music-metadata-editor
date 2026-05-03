import { Command } from "commander";
import { writeStderr } from "../../output/writeStderr.js";
import type { CliContext } from "../../types.js";
import { handleRead } from "./handleRead.js";
import { parseReadOptions, type ReadCliRawOptions } from "./parseReadOptions.js";

/**
 * Build the `mme read` subcommand wired to `loadTrack` / `readMetadata`.
 *
 * The returned command is meant to be attached to the top-level program via
 * `program.addCommand(...)`. All flag wiring lives here; argument validation
 * (mutually exclusive flags, audio-format whitelisting, etc.) happens in
 * `parseReadOptions`. The action body just translates the parse result into
 * a `handleRead` call and pumps its buffers to `process.stdout` /
 * `process.stderr`.
 *
 * @param context - Side-channel context (currently the stdin iterable).
 * @returns A configured commander `Command`.
 */
export const createReadCommand = (context: CliContext): Command => {
  const command = new Command("read")
    .description("Read metadata from a file or stdin")
    .argument("[file]", "input audio file (omit when using --stdin)")
    .option("--stdin", "read bytes from stdin instead of a file argument")
    .option("--format <fmt>", "force the audio format (required with --stdin)")
    .option("--pretty", "render a human-readable summary")
    .option("--field <name>", "extract a single field (dot path; tag.* prefix is implicit)")
    .option("--include <list>", "comma-separated list of sections to include")
    .option("--exclude <list>", "comma-separated list of sections to exclude")
    .option("--no-warnings", "drop warnings from the output")
    .action(async (file: string | undefined, raw: ReadCliRawOptions) => {
      const options = parseReadOptions({ file, opts: raw });
      const result = await handleRead({ options, context });
      if (result.stdout !== "") {
        process.stdout.write(result.stdout);
      }

      writeStderr(result.stderr);
    });

  command.addHelpText(
    "after",
    [
      "",
      "Examples:",
      "  $ mme read song.mp3",
      "  $ mme read song.mp3 --pretty",
      "  $ mme read song.mp3 --field tag.title",
      "  $ cat song.mp3 | mme read --stdin --format mp3",
    ].join("\n"),
  );

  return command;
};
