import type { Command } from "commander";

/**
 * Apply the Phase 1 baseline configuration to a commander {@link Command}.
 *
 * Sets the program name, description, the `-V, --version` and `-h, --help`
 * options, plus the global `--no-color` / `--quiet` / `--verbose` flags whose
 * behavior lives in `output/createLogger.ts`. A trailing `Examples:` block is
 * appended via `addHelpText("after", …)` so `mme --help` shows recipes
 * without bloating the per-flag table. Returning the same `Command` enables
 * fluent chaining by the caller.
 *
 * @param program - Bare `Command` instance to configure.
 * @param version - Version string sourced from `packages/cli/package.json`.
 * @returns The same `Command`, configured for the Phase 1 baseline.
 */
export const registerVersionAndHelp = (program: Command, version: string): Command => {
  program
    .name("mme")
    .description("Read and write audio file metadata.")
    .version(version, "-V, --version", "output the version number")
    .helpOption("-h, --help", "display help for command")
    .option("--no-color", "disable ANSI color in output")
    .option("--quiet", "suppress non-error chatter on stderr")
    .option("--verbose", "surface debug traces on stderr (mutually exclusive with --quiet)")
    .allowExcessArguments(false)
    // Silence commander's built-in stderr writer so the bin / runCli layer
    // owns the single `[mme] ...` message; otherwise commander prints the raw
    // error first and our prefixed message ends up duplicated below it.
    .configureOutput({ outputError: () => {} });

  program.addHelpText(
    "after",
    [
      "",
      "Examples:",
      "  $ mme read song.mp3                       Read metadata as JSON",
      "  $ mme read song.mp3 --pretty              Human-readable summary",
      "  $ mme read song.mp3 --field tag.title     Extract a single field",
      "  $ mme write song.mp3 --title 'New Title'  Set a tag field in place",
      "  $ mme picture extract song.mp3 -o art.jpg Extract embedded cover art",
      "  $ mme chapter list song.mp3 --pretty      List chapter marks as a table",
      "  $ mme lyrics get song.mp3 --format lrc    Print embedded lyrics in LRC",
      "",
      "Run `mme help <command>` to see flags for a given subcommand.",
    ].join("\n"),
  );

  return program;
};
