import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type PictureInfo, PictureKind, saveTrack } from "@akabeko/music-metadata-editor";

/**
 * Single silent MPEG-1 Layer III audio frame (32 kbps, 44.1 kHz, mono).
 *
 * 104 bytes total — the same frame core's own fixture generator uses, but
 * duplicated here so the CLI fixture pipeline does not reach into core's
 * private `tests/fixtures/` tree. The header bytes (`0xFF 0xFB 0x14 0xC4`)
 * are enough for `loadTrack` / `saveTrack` to detect the format and rewrite
 * the surrounding ID3v2 tag.
 */
const SILENT_MP3_FRAME: Uint8Array = (() => {
  const out = new Uint8Array(104);
  out[0] = 0xff;
  out[1] = 0xfb;
  out[2] = 0x14;
  out[3] = 0xc4;
  return out;
})();

/** A 1×1 blue PNG used as the dummy cover-art payload. */
const BLUE_PNG: Uint8Array = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108020000009077533" +
    "de0000000c4944415478da6360000200000005000147bd31070000000049454e44ae426082",
  "hex",
);

/** Output directory (`packages/cli/tests/fixtures/mp3/`). */
const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/mp3");

/** A single fixture description. */
type FixtureSpec = {
  /** Output filename within {@link FIXTURES_DIR}. */
  readonly filename: string;
  /** Tag fields to embed. */
  readonly tag: Record<string, string | number>;
  /** Optional pictures to embed. */
  readonly pictures?: readonly PictureInfo[];
};

const FIXTURES: readonly FixtureSpec[] = [
  {
    filename: "sample.mp3",
    tag: {
      title: "CLI Sample",
      artist: "CLI Tester",
      album: "Phase 2 Sample",
      trackNumber: 1,
      trackTotal: 3,
      year: 2026,
      genre: "Test",
    },
    pictures: [
      {
        mimeType: "image/png",
        kind: PictureKind.CoverFront,
        description: "",
        data: BLUE_PNG,
      },
    ],
  },
  {
    filename: "minimal.mp3",
    tag: {
      title: "Minimal",
    },
  },
];

/**
 * Build one fixture by re-saving the silent frame with the requested tag.
 *
 * @param spec - The fixture description.
 * @returns The bytes to write to disk.
 */
const build = async (spec: FixtureSpec): Promise<Uint8Array> => {
  const bytes = await saveTrack(
    {
      audioFormat: "mp3",
      tag: spec.tag,
      pictures: spec.pictures ?? [],
      chapters: [],
      additionalFields: {},
      warnings: [],
    },
    { source: SILENT_MP3_FRAME },
  );

  if (bytes === undefined) {
    throw new Error("saveTrack did not return bytes — `outputPath` was unexpectedly set");
  }

  return bytes;
};

/** Generator entry point. Run via `pnpm fixtures:mp3` from `packages/cli`. */
const main = async (): Promise<void> => {
  await mkdir(FIXTURES_DIR, { recursive: true });
  for (const spec of FIXTURES) {
    const bytes = await build(spec);
    const outPath = join(FIXTURES_DIR, spec.filename);
    await writeFile(outPath, bytes);
    process.stdout.write(`wrote ${spec.filename} — ${bytes.byteLength} bytes\n`);
  }
};

await main();
