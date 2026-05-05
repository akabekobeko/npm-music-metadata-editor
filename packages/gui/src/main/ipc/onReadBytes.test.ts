import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { onReadBytes } from "./onReadBytes.js";

const fakeEvent = {} as Electron.IpcMainInvokeEvent;

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mme-onReadBytes-"));
});

afterEach(async () => {
  if (tempDir !== "") {
    await rm(tempDir, { recursive: true, force: true });
  }
});

it("returns the file bytes for an existing file", async () => {
  const filePath = join(tempDir, "in.bin");
  const expected = new Uint8Array([0x01, 0x02, 0x03, 0xff]);
  await writeFile(filePath, Buffer.from(expected));

  const result = await onReadBytes(fakeEvent, { filePath });

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.filePath).toBe(filePath);
    expect(result.value.bytes).toEqual(expected);
  }
});

it("returns an IpcError when the file does not exist", async () => {
  const filePath = join(tempDir, "missing.bin");

  const result = await onReadBytes(fakeEvent, { filePath });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.message).toMatch(/ENOENT|no such file/i);
  }
});
