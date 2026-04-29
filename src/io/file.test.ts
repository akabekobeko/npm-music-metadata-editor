import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileBuffer } from "./file.js";

describe("readFileBuffer", () => {
  let dir = "";
  let path = "";

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "mme-"));
    path = join(dir, "sample.bin");
    await writeFile(path, new Uint8Array([1, 2, 3, 4]));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reads file contents into a Uint8Array", async () => {
    const bytes = await readFileBuffer(path);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });

  it("rejects with the underlying fs error when the file is missing", async () => {
    await expect(readFileBuffer(join(dir, "missing.bin"))).rejects.toThrow();
  });
});
