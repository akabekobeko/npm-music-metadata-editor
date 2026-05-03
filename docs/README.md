# Documentation Index

English / [Japanese](README.ja.md)

Index of the documents stored under `docs/`. When adding a new topic, create a subdirectory for it and append an entry below.

## Packages

- Core library: [`packages/core/README.md`](../packages/core/README.md)
- CLI (`mme`): [`packages/cli/README.md`](../packages/cli/README.md)

## Subdirectories

| Path | Contents |
| --- | --- |
| [`pkg/`](pkg/) | Per-package documentation. Each subdirectory (`pkg/core/`, `pkg/cli/`) hosts the implementation plan (`plan/`), the architecture overview (`architecture.md`), and recorded `/security-review` results (`security-review/`). |
| [`rules/`](rules/README.md) | Development rules per topic — coding style, testing, Git workflow, and so on. One topic per file. |

## Top-level docs about packages

| Path | Contents |
| --- | --- |
| [`plan.md`](plan.md) | Top-level index of the per-package implementation plans. Pointers into `pkg/<name>/plan/`. |

## Top-level documents

| Path | Contents |
| --- | --- |
| [`field-mapping.md`](field-mapping.md) | Mapping between each tag format (ID3v1/v2, Vorbis Comment, APE, MP4 atoms, RIFF/AIFF, WMA) and the common `TagData` shape. |

## Root documents

- Claude Code guidance: [`../CLAUDE.md`](../CLAUDE.md)
- Development rules (per topic): [`rules/README.md`](rules/README.md)
- Package overview / badges / usage examples: [`../README.md`](../README.md)
