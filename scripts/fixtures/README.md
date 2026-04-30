# Fixture generation scripts

Each format has its own generator under this directory (e.g. `mp3.ts`).
A generator writes out one or more `.mp3` / `.flac` / … files into
`tests/fixtures/<format>/`. The generated binaries are committed so CI does
not need a working generator to run the test suite, but the scripts must stay
reusable so we can refresh fixtures (or add new variants) any time the
metadata writers change.

## Running

```bash
pnpm fixtures:mp3
pnpm fixtures:flac
```

Each generator prints a one-line summary per file produced. Files are
**overwritten in place** — review the resulting diff before committing.

## Conventions

- Audio payload is pure silence at the smallest valid frame size.
- Embedded picture data is a tiny solid-blue PNG.
- Embedded lyrics use the pangram `"the quick brown fox jumps over the lazy
  dog"` so it is easy to spot in hex dumps.
- Each fixture's filename embeds its variant (`v23-basic.mp3`,
  `v24-with-apic.mp3`, …); the generator's source code is the single source of
  truth for what each fixture contains.

When a future phase adds support for a new metadata kind (e.g. real APIC
parsing in Phase 9), update the corresponding generator so the fixture
exercises the new path, then commit the regenerated binary alongside the code
change.
