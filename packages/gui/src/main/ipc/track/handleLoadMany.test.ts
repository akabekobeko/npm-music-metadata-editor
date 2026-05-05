import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleLoadMany } from "./handleLoadMany.js";

/** Minimal MPEG-1 Layer III frame; identical to the helper in `handleLoadTrack.test.ts`. */
const buildSilentMp3 = (): Uint8Array => {
  const buf = new Uint8Array(104);
  buf[0] = 0xff;
  buf[1] = 0xfb;
  buf[2] = 0x14;
  buf[3] = 0xc4;
  return buf;
};

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mme-handleLoadMany-"));
});

afterEach(async () => {
  if (tempDir !== "") {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe("handleLoadMany", () => {
  it("returns ok results for each file when all succeed", async () => {
    const aPath = join(tempDir, "a.mp3");
    const bPath = join(tempDir, "b.mp3");
    await writeFile(aPath, buildSilentMp3());
    await writeFile(bPath, buildSilentMp3());

    const response = await handleLoadMany({ filePaths: [aPath, bPath] });

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.value).toHaveLength(2);
    expect(response.value[0]?.filePath).toBe(aPath);
    expect(response.value[0]?.result.ok).toBe(true);
    expect(response.value[1]?.filePath).toBe(bPath);
    expect(response.value[1]?.result.ok).toBe(true);
  });

  it("isolates per-file failures (mixed success/failure)", async () => {
    const goodPath = join(tempDir, "good.mp3");
    const badPath = join(tempDir, "bad.bin");
    await writeFile(goodPath, buildSilentMp3());
    await writeFile(badPath, new Uint8Array([0, 0, 0, 0]));

    const response = await handleLoadMany({ filePaths: [goodPath, badPath] });

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.value[0]?.result.ok).toBe(true);
    expect(response.value[1]?.result.ok).toBe(false);
  });

  it("returns failure entries when every file is invalid", async () => {
    const aPath = join(tempDir, "a.bin");
    const bPath = join(tempDir, "b.bin");
    await writeFile(aPath, new Uint8Array([0]));
    await writeFile(bPath, new Uint8Array([0]));

    const response = await handleLoadMany({ filePaths: [aPath, bPath] });

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.value.every((entry) => entry.result.ok === false)).toBe(true);
  });

  it("returns an empty list when no paths are passed", async () => {
    const response = await handleLoadMany({ filePaths: [] });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.value).toEqual([]);
    }
  });
});
