import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeAtomic } from "./writeAtomic.js";

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "mme-write-atomic-"));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("writeAtomic", () => {
  it("creates the target file when it does not exist yet", async () => {
    const target = join(workDir, "song.mp3");
    await writeAtomic(target, new Uint8Array([1, 2, 3]));
    const result = await readFile(target);
    expect(Array.from(result)).toEqual([1, 2, 3]);
  });

  it("overwrites an existing file in place", async () => {
    const target = join(workDir, "song.mp3");
    await writeFile(target, new Uint8Array([0xff, 0xff]));
    await writeAtomic(target, new Uint8Array([0x10, 0x20, 0x30]));
    const result = await readFile(target);
    expect(Array.from(result)).toEqual([0x10, 0x20, 0x30]);
  });

  it("does not leave a temp file alongside the target on success", async () => {
    const target = join(workDir, "song.mp3");
    await writeAtomic(target, new Uint8Array([1]));
    const entries = await readdir(workDir);
    expect(entries).toEqual(["song.mp3"]);
  });

  it("throws when the destination directory does not exist", async () => {
    const target = join(workDir, "nope", "song.mp3");
    await expect(writeAtomic(target, new Uint8Array([1]))).rejects.toThrow();
  });

  it("preserves the original target and cleans up the temp file when rename fails", async () => {
    // `rename` to an existing directory fails, exercising the catch path
    // after the tmp file has already been written.
    const target = join(workDir, "song.mp3");
    await mkdir(target);
    await expect(writeAtomic(target, new Uint8Array([1, 2, 3]))).rejects.toThrow();
    const targetStat = await stat(target);
    expect(targetStat.isDirectory()).toBe(true);
    const entries = await readdir(workDir);
    expect(entries).toEqual(["song.mp3"]);
  });
});
