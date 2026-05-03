# @akabeko/music-metadata-editor-cli

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

English / [Japanese](README.ja.md)

Command-line interface for [@akabeko/music-metadata-editor](../core). Phase 1 only ships the program skeleton — `mme --version` and `mme --help` are wired up so subsequent phases can plug in subcommands.

> **Status**: not yet published to npm. The package is `private` until Phase 5 introduces release tooling.

## Requirements

- Node.js 24 or newer (matches `@akabeko/music-metadata-editor`)

## Local usage

From the repository root:

```sh
pnpm install
pnpm --filter @akabeko/music-metadata-editor-cli build
node packages/cli/dist/bin/mme.js --version
node packages/cli/dist/bin/mme.js --help
```

`mme --version` echoes the value of `package.json#version`. `mme --help` prints the canonical commander usage block.

## Exit codes

The CLI uses a fixed exit code table. The canonical source of truth is [`docs/plan/cli/phase-01-foundation.md`](../../docs/plan/cli/phase-01-foundation.md); this README mirrors the table as a quick reference.

| Code | Meaning |
| --- | --- |
| `0` | Success. |
| `1` | Generic / unclassified failure (also used as the fallback for unmapped `MmeError` codes). |
| `2` | Misuse — argument parsing failed (commander). |
| `3` | Format detection failed or no reader/writer is registered (`MmeError.code === "unsupported-format"`). |
| `4` | File / stream I/O failure (`ENOENT`, `EACCES`, …). |
| `5` | A tag block was found but its bytes were structurally invalid (`MmeError.code === "invalid-tag"`). |

## Development

Inside `packages/cli`:

```sh
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

Or via the workspace:

```sh
pnpm -r typecheck
pnpm -r test
pnpm -r build
pnpm check
```

## Package layout

The package follows the directory rules in [`docs/rules/directory-structure.md`](../../docs/rules/directory-structure.md). Phase 1 establishes the skeleton:

```
src/
  cli.ts                          # createProgram + runCli
  bin/mme.ts                      # bin shim
  commands/
    registerVersionAndHelp.ts     # baseline commander setup
  output/
    writeJson.ts                  # stdout (machine-readable)
    writePretty.ts                # stdout (human-readable, JSON in Phase 1)
    printWarning.ts               # stderr
  errors/
    exitCodes.ts                  # exit code table + MmeError lookup
    formatMmeError.ts             # error -> { message, exitCode }
  types.ts                        # CLI-internal shared types
tests/
  cliRunner.ts                    # re-export of runCli for test files
  cli.smoke.test.ts               # spawn-based shebang sanity check
```

## Roadmap

See [`docs/plan/cli/`](../../docs/plan/cli/) for the phase-by-phase plan. Phase 2 adds the `read` subcommand; Phase 3 adds field-level write flags; Phase 4 covers extras (pictures / chapters / lyrics); Phase 5 prepares the package for npm publication.
