import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearRegistrations, registerFormat } from "./formats/registry.js";
import { readMetadata, writeMetadata } from "./mme.js";

beforeEach(() => {
  clearRegistrations();
});

afterEach(() => {
  clearRegistrations();
});

describe("readMetadata", () => {
  it("throws when format detection fails", async () => {
    await expect(readMetadata(new Uint8Array([0, 0, 0, 0]))).rejects.toThrow(
      /could not detect format/i,
    );
  });

  it("throws when no reader is registered for the detected format", async () => {
    registerFormat({
      format: "mp3",
      extensions: [".mp3"],
      detectSignature: (h) => h.length >= 3 && h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33,
    });
    await expect(readMetadata(new Uint8Array([0x49, 0x44, 0x33]))).rejects.toThrow(
      /no reader registered/i,
    );
  });

  it("delegates to the registered reader when one exists", async () => {
    registerFormat({
      format: "mp3",
      extensions: [".mp3"],
      detectSignature: (h) => h.length >= 3 && h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33,
      read: async () => ({
        audioFormat: "mp3",
        tag: { title: "ok" },
        pictures: [],
        chapters: [],
      }),
    });
    const result = await readMetadata(new Uint8Array([0x49, 0x44, 0x33, 0x03]));
    expect(result.audioFormat).toBe("mp3");
    expect(result.tag.title).toBe("ok");
  });

  it("honours the explicit format override", async () => {
    let invoked = false;
    registerFormat({
      format: "flac",
      extensions: [".flac"],
      detectSignature: () => false,
      read: async () => {
        invoked = true;
        return { audioFormat: "flac", tag: {}, pictures: [], chapters: [] };
      },
    });
    await readMetadata(new Uint8Array([0, 0, 0, 0]), { format: "flac" });
    expect(invoked).toBe(true);
  });
});

describe("writeMetadata", () => {
  it("throws when no writer is registered", async () => {
    registerFormat({
      format: "mp3",
      extensions: [".mp3"],
      detectSignature: (h) => h.length >= 3 && h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33,
    });
    await expect(writeMetadata(new Uint8Array([0x49, 0x44, 0x33]), { tag: {} })).rejects.toThrow(
      /no writer registered/i,
    );
  });

  it("delegates to the registered writer when one exists", async () => {
    registerFormat({
      format: "mp3",
      extensions: [".mp3"],
      detectSignature: (h) => h.length >= 3 && h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33,
      write: async (input) => {
        const out = new Uint8Array(input.length + 1);
        out.set(input);
        out[input.length] = 0xff;
        return out;
      },
    });
    const out = await writeMetadata(new Uint8Array([0x49, 0x44, 0x33]), { tag: { title: "x" } });
    expect(out[3]).toBe(0xff);
  });
});
