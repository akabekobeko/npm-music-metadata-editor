# Changelog

All notable changes to `@akabeko/music-metadata-editor-cli` will be documented in this file. The format roughly follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The CLI is versioned independently of the core library.

## 0.1.0 — initial release candidate

- `mme read` — read metadata as JSON, pretty text, or a single field; supports stdin streaming with `--format`.
- `mme write` — set / clear tag fields; atomic file writes by default, `--dry-run` for preview.
- `mme picture {extract,set,clear}` — manage embedded pictures (cover art etc.).
- `mme chapter {list,set,clear}` — manage chapter marks.
- `mme lyrics {get,set,clear}` — manage embedded lyrics in `text` / `lrc` / `json` shape.
- Global flags: `--no-color`, `--quiet`, `--verbose` (`--quiet` + `--verbose` together exits with code `2`). Honors `NO_COLOR` and `FORCE_COLOR`.
- Documented exit codes (`0` / `1` / `2` / `3` / `4` / `5`) plus a translation table from eyeD3 / mid3v2 / metaflac / AtomicParsley flags.
- `bin` published as `mme` (`./dist/bin/mme.js`); `prepublishOnly` runs `clean + build + test`.
