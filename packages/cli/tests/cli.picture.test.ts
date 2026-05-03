import { Buffer } from "node:buffer";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ExitCode } from "../src/errors/exitCodes.js";
import { runCli } from "./cliRunner.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const sampleMp3 = path.resolve(here, "fixtures/mp3/sample.mp3");

// Smallest plausible JPEG byte stream: SOI + a short app marker + EOI. The
// CLI only stores the bytes verbatim; the round-trip tests just need
// something distinct from the PNG payload.
const RED_JPEG = Buffer.from("ffd8ffe000104a46494600010100ffd9", "hex");

const BLUE_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108020000009077533" +
    "de0000000c4944415478da6360000200000005000147bd31070000000049454e44ae426082",
  "hex",
);

let workDir: string;
let workMp3: string;
let coverJpg: string;
let coverPng: string;

beforeEach(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "mme-picture-e2e-"));
  workMp3 = path.join(workDir, "song.mp3");
  coverJpg = path.join(workDir, "cover.jpg");
  coverPng = path.join(workDir, "cover.png");
  await copyFile(sampleMp3, workMp3);
  await writeFile(coverJpg, RED_JPEG);
  await writeFile(coverPng, BLUE_PNG);
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

/**
 * Read picture metadata via `mme read --field pictures`.
 *
 * @param file - Path to the audio file.
 * @returns Parsed picture entries (without raw bytes).
 */
const readPictures = async (
  file: string,
): Promise<readonly { mimeType: string; kind: number; byteLength: number }[]> => {
  const result = await runCli(["read", file, "--field", "pictures"]);
  expect(result.exitCode).toBe(ExitCode.Success);
  return JSON.parse(result.stdout) as readonly {
    mimeType: string;
    kind: number;
    byteLength: number;
  }[];
};

describe("mme picture set / extract / clear", () => {
  it("set --replace --kind cover-front replaces the cover and survives a round trip", async () => {
    const set = await runCli([
      "picture",
      "set",
      workMp3,
      "--input",
      coverJpg,
      "--kind",
      "cover-front",
      "--replace",
    ]);
    expect(set.exitCode).toBe(ExitCode.Success);
    expect(set.stderr).toContain("[mme] wrote:");

    const pictures = await readPictures(workMp3);
    expect(pictures).toHaveLength(1);
    expect(pictures[0]?.mimeType).toBe("image/jpeg");
    expect(pictures[0]?.byteLength).toBe(RED_JPEG.byteLength);

    const out = path.join(workDir, "out.jpg");
    const extract = await runCli(["picture", "extract", workMp3, "--output", out]);
    expect(extract.exitCode).toBe(ExitCode.Success);
    const extracted = await readFile(out);
    expect(Buffer.compare(extracted, RED_JPEG)).toBe(0);
  });

  it("set without --replace appends a second picture", async () => {
    await runCli(["picture", "set", workMp3, "--input", coverJpg, "--kind", "cover-back"]);
    const pictures = await readPictures(workMp3);
    expect(pictures).toHaveLength(2);
    expect(pictures.map((p) => p.mimeType)).toEqual(["image/png", "image/jpeg"]);
  });

  it("set rejects a duplicate (same kind / mime / bytes) without --replace", async () => {
    const set = await runCli([
      "picture",
      "set",
      workMp3,
      "--input",
      coverPng,
      "--kind",
      "cover-front",
    ]);
    expect(set.exitCode).toBe(ExitCode.Success);
    expect(set.stderr).toContain("already present");
    const pictures = await readPictures(workMp3);
    expect(pictures).toHaveLength(1);
  });

  it("extract --output - writes raw bytes to stdout", async () => {
    const extract = await runCli(["picture", "extract", workMp3, "--output", "-"]);
    expect(extract.exitCode).toBe(ExitCode.Success);
    expect(Buffer.compare(Buffer.from(extract.stdoutBytes), BLUE_PNG)).toBe(0);
    expect(extract.stderr).toContain("extracted picture");
  });

  it("extract --auto-extension appends the inferred extension", async () => {
    const stem = path.join(workDir, "out");
    await runCli(["picture", "extract", workMp3, "--output", stem, "--auto-extension"]);
    const written = await readFile(`${stem}.png`);
    expect(Buffer.compare(written, BLUE_PNG)).toBe(0);
  });

  it("extract fails with exit 1 when no picture matches --kind", async () => {
    const result = await runCli([
      "picture",
      "extract",
      workMp3,
      "--output",
      "-",
      "--kind",
      "cover-back",
    ]);
    expect(result.exitCode).toBe(ExitCode.Failure);
    expect(result.stderr).toContain("no picture matched");
  });

  it("clear removes every picture by default", async () => {
    await runCli(["picture", "clear", workMp3]);
    expect(await readPictures(workMp3)).toEqual([]);
  });

  it("clear --kind cover-front removes only matching pictures", async () => {
    await runCli(["picture", "set", workMp3, "--input", coverJpg, "--kind", "cover-back"]);
    await runCli(["picture", "clear", workMp3, "--kind", "cover-front"]);
    const pictures = await readPictures(workMp3);
    expect(pictures.map((p) => p.mimeType)).toEqual(["image/jpeg"]);
  });

  it("set --kind unknown-name → exit 2", async () => {
    const result = await runCli([
      "picture",
      "set",
      workMp3,
      "--input",
      coverJpg,
      "--kind",
      "bogus-kind",
    ]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("unknown picture kind");
  });

  it("set --input - requires --mime", async () => {
    const result = await runCli(
      ["picture", "set", workMp3, "--input", "-", "--kind", "cover-front"],
      { stdin: new Uint8Array(RED_JPEG) },
    );
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("--mime is required");
  });

  it("set reads bytes from stdin with --mime", async () => {
    const result = await runCli(
      [
        "picture",
        "set",
        workMp3,
        "--input",
        "-",
        "--kind",
        "cover-front",
        "--mime",
        "image/jpeg",
        "--replace",
      ],
      { stdin: new Uint8Array(RED_JPEG) },
    );
    expect(result.exitCode).toBe(ExitCode.Success);
    const pictures = await readPictures(workMp3);
    expect(pictures[0]?.mimeType).toBe("image/jpeg");
    expect(pictures[0]?.byteLength).toBe(RED_JPEG.byteLength);
  });
});
