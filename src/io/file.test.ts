import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { readFileBuffer, writeFileBuffer } from "./file.js";

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

it("writeFileBuffer writes the given bytes to disk", async () => {
  const target = join(dir, "out.bin");
  await writeFileBuffer(target, new Uint8Array([10, 20, 30]));
  const written = await readFile(target);
  expect(Array.from(written)).toEqual([10, 20, 30]);
});

it("writeFileBuffer overwrites an existing file", async () => {
  const target = join(dir, "overwrite.bin");
  await writeFileBuffer(target, new Uint8Array([1, 1, 1]));
  await writeFileBuffer(target, new Uint8Array([2, 2]));
  const written = await readFile(target);
  expect(Array.from(written)).toEqual([2, 2]);
});
