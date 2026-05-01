import { afterEach, beforeEach, expect, it } from "vitest";
import { isMmeError } from "../errors/mmeError.js";
import { clearRegistrations, registerFormat } from "../formats/registry.js";
import { readMetadata } from "./readMetadata.js";

beforeEach(() => {
  clearRegistrations();
});

afterEach(() => {
  clearRegistrations();
});

it("throws an MmeError(unsupported-format) when format detection fails", async () => {
  await expect(readMetadata(new Uint8Array([0, 0, 0, 0]))).rejects.toMatchObject({
    name: "MmeError",
    code: "unsupported-format",
  });
});

it("throws an MmeError(unsupported-format) when no reader is registered", async () => {
  registerFormat({
    format: "mp3",
    extensions: [".mp3"],
    detectSignature: (h) => h.length >= 3 && h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33,
  });
  try {
    await readMetadata(new Uint8Array([0x49, 0x44, 0x33]));
    expect.fail("expected readMetadata to reject");
  } catch (error) {
    expect(isMmeError(error)).toBe(true);
    if (isMmeError(error)) {
      expect(error.code).toBe("unsupported-format");
      expect(error.message).toMatch(/no reader registered/i);
    }
  }
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

it("wraps reader errors into MmeError(invalid-tag) with the original as cause", async () => {
  const original = new Error("boom from reader");
  registerFormat({
    format: "mp3",
    extensions: [".mp3"],
    detectSignature: (h) => h.length >= 3 && h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33,
    read: async () => {
      throw original;
    },
  });
  try {
    await readMetadata(new Uint8Array([0x49, 0x44, 0x33]));
    expect.fail("expected readMetadata to reject");
  } catch (error) {
    expect(isMmeError(error)).toBe(true);
    if (isMmeError(error)) {
      expect(error.code).toBe("invalid-tag");
      expect(error.cause).toBe(original);
    }
  }
});

it("preserves MmeError thrown by readers without re-wrapping", async () => {
  registerFormat({
    format: "mp3",
    extensions: [".mp3"],
    detectSignature: (h) => h.length >= 3 && h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33,
    read: async () => {
      const { createMmeError } = await import("../errors/mmeError.js");
      throw createMmeError({ code: "truncated-input", message: "out of bytes" });
    },
  });
  try {
    await readMetadata(new Uint8Array([0x49, 0x44, 0x33]));
    expect.fail("expected readMetadata to reject");
  } catch (error) {
    expect(isMmeError(error)).toBe(true);
    if (isMmeError(error)) {
      expect(error.code).toBe("truncated-input");
    }
  }
});
