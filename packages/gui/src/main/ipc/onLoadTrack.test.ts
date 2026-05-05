import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { onLoadTrack } from "./onLoadTrack.js";

/**
 * Build a tiny MP3-shaped buffer (single MPEG-1 Layer III frame, silence-padded).
 *
 * Mirrors the SILENT_MP3_FRAME used in core's fixtures: header bytes
 * `0xFF 0xFB 0x14 0xC4` describe a 32 kbps / 44.1 kHz / mono frame, padded with
 * zeros to the 104-byte frame length. Phase 2 just needs the reader to
 * recognise the format and return; full audio fidelity is out of scope.
 *
 * @returns A Uint8Array containing the synthetic frame.
 */
const buildSilentMp3 = (): Uint8Array => {
  const buf = new Uint8Array(104);
  buf[0] = 0xff;
  buf[1] = 0xfb;
  buf[2] = 0x14;
  buf[3] = 0xc4;
  return buf;
};

/** Minimal event stub; `onLoadTrack` ignores `ev`. */
const fakeEvent = {} as Electron.IpcMainInvokeEvent;

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mme-onLoadTrack-"));
});

afterEach(async () => {
  if (tempDir !== "") {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe("onLoadTrack", () => {
  it("returns the loaded track for a recognised MP3", async () => {
    const filePath = join(tempDir, "silent.mp3");
    await writeFile(filePath, buildSilentMp3());

    const result = await onLoadTrack(fakeEvent, { filePath });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.filePath).toBe(filePath);
      expect(result.value.track.audioFormat).toBe("mp3");
    }
  });

  it("returns an IpcError when the file does not exist", async () => {
    const filePath = join(tempDir, "missing.mp3");

    const result = await onLoadTrack(fakeEvent, { filePath });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/ENOENT|no such file/i);
    }
  });

  it("returns an IpcError when the file is not a recognised audio format", async () => {
    const filePath = join(tempDir, "garbage.bin");
    await writeFile(filePath, new Uint8Array([0x00, 0x00, 0x00, 0x00]));

    const result = await onLoadTrack(fakeEvent, { filePath });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.name).toBe("MmeError");
      expect(result.error.code).toBe("unsupported-format");
    }
  });
});
