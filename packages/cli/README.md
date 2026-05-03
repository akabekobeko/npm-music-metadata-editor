# @akabeko/music-metadata-editor-cli

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

English / [Japanese](README.ja.md)

Command-line interface for [@akabeko/music-metadata-editor](../core). Phase 2 ships the `mme read` subcommand for reading metadata; Phase 3+ will add write / extras / publish support per [`docs/plan/cli/`](../../docs/plan/cli/).

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

## `mme read` (Phase 2)

Read metadata from a file or stdin. Output defaults to JSON; `--pretty` switches to a human-readable summary, and `--field <name>` extracts a single value.

```sh
# JSON, full payload
mme read song.mp3

# Pretty-printed summary
mme read song.mp3 --pretty

# Single field (the implicit `tag.` prefix means `title` ≡ `tag.title`)
mme read song.mp3 --field title
mme read song.mp3 --field tag.artist
mme read song.mp3 --field audioFormat
mme read song.mp3 --field durationMs

# Filter sections (mutually exclusive with --exclude)
mme read song.mp3 --include audioFormat,tag
mme read song.mp3 --exclude pictures,warnings --no-warnings

# Streaming mode: pipe bytes through stdin (--format is required, no auto-detect)
cat song.mp3 | mme read --stdin --format mp3
```

### Notes

- `pictures[].data` is **not** emitted in JSON output (binary in JSON is unreadable). The CLI replaces it with `byteLength`; a future `mme picture extract` subcommand (Phase 4) will retrieve the raw bytes.
- `--field` against a compound section (`tag`, `pictures`, ...) emits JSON instead of a stringified scalar.
- Mutually exclusive flag combinations (`--stdin` + file argument, `--pretty` + `--field`, `--include` + `--exclude`) exit with code `2`.
- Field misses (`--field nonexistent`) exit with code `1` and write `[mme] field "<path>" not found` to stderr.

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
