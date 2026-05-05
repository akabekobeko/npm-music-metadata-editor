import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { onWriteBytes } from "./onWriteBytes.js";

const fakeEvent = {} as Electron.IpcMainInvokeEvent;

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mme-onWriteBytes-"));
});

afterEach(async () => {
  if (tempDir !== "") {
    await rm(tempDir, { recursive: true, force: true });
  }
});

it("writes the bytes to the destination path", async () => {
  const filePath = join(tempDir, "out.bin");
  const bytes = new Uint8Array([1, 2, 3, 4]);

  const result = await onWriteBytes(fakeEvent, { filePath, bytes });

  expect(result.ok).toBe(true);
  const written = await readFile(filePath);
  expect(new Uint8Array(written)).toEqual(bytes);
});

it("overwrites an existing file without prompting", async () => {
  const filePath = join(tempDir, "out.bin");
  await writeFile(filePath, Buffer.from([0xff]));
  const bytes = new Uint8Array([0x01, 0x02]);

  const result = await onWriteBytes(fakeEvent, { filePath, bytes });

  expect(result.ok).toBe(true);
  const written = await readFile(filePath);
  expect(new Uint8Array(written)).toEqual(bytes);
});

it("returns an IpcError when the directory does not exist", async () => {
  const filePath = join(tempDir, "missing-dir", "out.bin");

  const result = await onWriteBytes(fakeEvent, {
    filePath,
    bytes: new Uint8Array([0x00]),
  });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.message).toMatch(/ENOENT|no such file/i);
  }
});
