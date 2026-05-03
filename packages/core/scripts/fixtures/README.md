# Fixture generation scripts

Each format has its own generator under this directory (e.g. `mp3.ts`). A generator writes out one or more `.mp3` / `.flac` / … files into `tests/fixtures/<format>/`. The generated binaries are committed so CI does not need a working generator to run the test suite, but the scripts must stay reusable so we can refresh fixtures (or add new variants) any time the metadata writers change.

## Running

```bash
pnpm fixtures:mp3
pnpm fixtures:flac
pnpm fixtures:mp4
pnpm fixtures:ogg
pnpm fixtures:ape
pnpm fixtures:wav
pnpm fixtures:aiff
pnpm fixtures:wma
```

Each generator prints a one-line summary per file produced. Files are **overwritten in place** — review the resulting diff before committing.

## Conventions

- Audio payload is pure silence at the smallest valid frame size.
- Embedded picture data is a tiny solid-blue PNG.
- Embedded lyrics use the pangram `"the quick brown fox jumps over the lazy dog"` so it is easy to spot in hex dumps.
- Each fixture's filename embeds its variant (`v23-basic.mp3`, `v24-with-apic.mp3`, …); the generator's source code is the single source of truth for what each fixture contains.

When a generator adds support for a new metadata kind, update the fixture so it exercises the new path, then commit the regenerated binary alongside the code change.
