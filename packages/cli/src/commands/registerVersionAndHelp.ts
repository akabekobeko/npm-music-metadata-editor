import type { Command } from "commander";

/**
 * Apply the Phase 1 baseline configuration to a commander {@link Command}.
 *
 * Sets the program name, description, the `-V, --version` and `-h, --help`
 * options, plus the global `--no-color` / `--quiet` flags whose behaviour is
 * implemented in Phase 5. Returning the same `Command` enables fluent chaining
 * by the caller.
 *
 * @param program - Bare `Command` instance to configure.
 * @param version - Version string sourced from `packages/cli/package.json`.
 * @returns The same `Command`, configured for the Phase 1 baseline.
 */
export const registerVersionAndHelp = (program: Command, version: string): Command =>
  program
    .name("mme")
    .description("Read and write audio file metadata.")
    .version(version, "-V, --version", "output the version number")
    .helpOption("-h, --help", "display help for command")
    .option("--no-color", "disable ANSI color in output")
    .option("--quiet", "suppress non-error chatter on stderr")
    .allowExcessArguments(false)
    // Silence commander's built-in stderr writer so the bin / runCli layer
    // owns the single `[mme] ...` message; otherwise commander prints the raw
    // error first and our prefixed message ends up duplicated below it.
    .configureOutput({ outputError: () => {} });
