# @akabeko/music-metadata-editor-cli

[![npm](https://img.shields.io/npm/v/@akabeko/music-metadata-editor-cli.svg)](https://www.npmjs.com/package/@akabeko/music-metadata-editor-cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

English / [Japanese](README.ja.md)

`mme` is the command-line companion to [@akabeko/music-metadata-editor](../core). It reads and writes audio file metadata (tags, embedded pictures, chapter marks, lyrics) on top of the same core library used by the Node.js API.

## Requirements

- Node.js 24 or newer (matches `@akabeko/music-metadata-editor`).

## Installation

```sh
# Global install
npm install -g @akabeko/music-metadata-editor-cli

# Or invoke ad-hoc without installing
pnpm dlx @akabeko/music-metadata-editor-cli --help
npx @akabeko/music-metadata-editor-cli --help
```

The bin name is `mme`.

## Quick start

```sh
# Read metadata as JSON
mme read song.mp3

# Read a single field
mme read song.mp3 --field tag.title

# Write a tag (atomic by default)
mme write song.mp3 --title 'Hello' --artist 'World'

# Extract embedded cover art to a file
mme picture extract song.mp3 --output cover.jpg

# Print embedded lyrics in LRC format
mme lyrics get song.mp3 --format lrc
```

For a complete flag listing on any subcommand, use `mme help <subcommand>` or `mme <subcommand> --help`.

## Subcommands

| Command | Purpose |
| --- | --- |
| `mme read [file]` | Read metadata as JSON (default), pretty text, or a single field. Supports stdin streaming. |
| `mme write [file]` | Set / clear tag fields. Atomic file write by default; `--dry-run` previews without touching disk. |
| `mme picture extract <file>` | Extract one embedded picture to a file or stdout. |
| `mme picture set <file>` | Embed a picture; `--replace` swaps existing entries. |
| `mme picture clear <file>` | Remove embedded pictures (optionally scoped by `--kind`). |
| `mme chapter list <file>` | List chapter marks (JSON or `--pretty` table). |
| `mme chapter set <file>` | Replace the chapter list from a JSON document. |
| `mme chapter clear <file>` | Remove every chapter mark. |
| `mme lyrics get <file>` | Print lyrics as `text` (default), `lrc`, or `json`. |
| `mme lyrics set <file>` | Embed lyrics from a `--text` / `--lrc` / `--json` source. |
| `mme lyrics clear <file>` | Remove embedded lyrics. |

### Global flags

| Flag | Behavior |
| --- | --- |
| `-V, --version` | Print the CLI version. |
| `-h, --help` | Print usage. |
| `--no-color` | Disable ANSI color in stderr output. |
| `--quiet` | Suppress info / warning lines (errors still flow). |
| `--verbose` | Surface debug traces. Mutually exclusive with `--quiet` (exit `2`). |

The CLI also honors the [NO_COLOR](https://no-color.org/) and [FORCE_COLOR](https://force-color.org/) environment variables.

## Exit codes

The exit codes are the same shape as the rest of the project. The canonical source of truth is [`docs/plan/cli/phase-01-foundation.md`](../../docs/plan/cli/phase-01-foundation.md); the table is mirrored here for quick reference.

| Code | Meaning |
| --- | --- |
| `0` | Success. |
| `1` | Generic / unclassified failure (also the fallback for unmapped `MmeError` codes). |
| `2` | Misuse — argument parsing failed (commander), including `--quiet --verbose` together. |
| `3` | Format detection failed or no reader/writer is registered (`MmeError.code === "unsupported-format"`). |
| `4` | File / stream I/O failure (`ENOENT`, `EACCES`, …). |
| `5` | A tag block was found but its bytes were structurally invalid (`MmeError.code === "invalid-tag"`). |

CI / shell users can rely on `if [ $? -eq 0 ]; then ...; fi`; classified failures pick a code from the table, while unknown failures land at `1` rather than misusing an unrelated slot.

## Known limitations

- `pictures[].data` is **not** emitted in JSON output (binary in JSON is unreadable). The CLI replaces it with `byteLength`; use `mme picture extract` for the raw bytes.
- `--clear all` works in `mme write`, but stream mode (`mme write --stdin`) cannot use `--clear` because clearing requires a current track to subtract from. Use file mode to clear fields.
- `mme lyrics get --format text` ignores the synchronized timing data in LRC payloads — request `--format lrc` or `--format json` to retain timestamps.
- Shell completion scripts are not shipped yet. The `commander` ecosystem has third-party generators (e.g. `@commander-js/extra-typings` and `bash-complete-commander`); a future release may bundle one.

## Existing-tool translation table

Quick mapping between common flags from other taggers and the closest `mme` invocation. Not every flag has a 1:1 equivalent; consult `mme <subcommand> --help` for the canonical surface.

### eyeD3 (ID3 / MP3)

| eyeD3 | mme |
| --- | --- |
| `eyeD3 song.mp3` | `mme read song.mp3 --pretty` |
| `eyeD3 --title 'X' song.mp3` | `mme write song.mp3 --title 'X'` |
| `eyeD3 --artist 'A' --album 'B' song.mp3` | `mme write song.mp3 --artist 'A' --album 'B'` |
| `eyeD3 --add-image cover.jpg:FRONT_COVER song.mp3` | `mme picture set song.mp3 --input cover.jpg --kind cover-front` |
| `eyeD3 --remove-all-images song.mp3` | `mme picture clear song.mp3` |
| `eyeD3 --remove-all song.mp3` | `mme write song.mp3 --clear all` |

### mid3v2 (mutagen, ID3v2)

| mid3v2 | mme |
| --- | --- |
| `mid3v2 song.mp3` | `mme read song.mp3 --pretty` |
| `mid3v2 -t 'X' song.mp3` | `mme write song.mp3 --title 'X'` |
| `mid3v2 -a 'A' -A 'B' song.mp3` | `mme write song.mp3 --artist 'A' --album 'B'` |
| `mid3v2 --picture cover.jpg song.mp3` | `mme picture set song.mp3 --input cover.jpg` |
| `mid3v2 --delete-all song.mp3` | `mme write song.mp3 --clear all` |

### metaflac (FLAC)

| metaflac | mme |
| --- | --- |
| `metaflac --show-tag=TITLE song.flac` | `mme read song.flac --field tag.title` |
| `metaflac --set-tag=TITLE='X' song.flac` | `mme write song.flac --title 'X'` |
| `metaflac --import-picture-from=cover.jpg song.flac` | `mme picture set song.flac --input cover.jpg` |
| `metaflac --remove-all-tags song.flac` | `mme write song.flac --clear all` |

### AtomicParsley (MP4 / M4A / M4B)

| AtomicParsley | mme |
| --- | --- |
| `AtomicParsley song.m4a` | `mme read song.m4a --pretty` |
| `AtomicParsley song.m4a --title 'X'` | `mme write song.m4a --title 'X'` |
| `AtomicParsley song.m4a --artwork cover.jpg` | `mme picture set song.m4a --input cover.jpg` |
| `AtomicParsley song.m4a --remove artwork` | `mme picture clear song.m4a` |
| `AtomicParsley song.m4a --DeepScan ...` | `mme write song.m4a ...` (atomic by default — no `--overWrite` needed) |

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

A dry-run publish (no actual upload) is available via:

```sh
pnpm --filter @akabeko/music-metadata-editor-cli publish --dry-run --access public
```

## License

[MIT](LICENSE).
