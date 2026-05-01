import { afterEach, beforeEach, expect, it } from "vitest";
import { isMmeError } from "../errors/mmeError.js";
import { clearRegistrations, registerFormat } from "../formats/registry.js";
import { writeMetadata } from "./writeMetadata.js";

beforeEach(() => {
  clearRegistrations();
});

afterEach(() => {
  clearRegistrations();
});

it("throws an MmeError(unsupported-format) when no writer is registered", async () => {
  registerFormat({
    format: "mp3",
    extensions: [".mp3"],
    detectSignature: (h) => h.length >= 3 && h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33,
  });
  try {
    await writeMetadata(new Uint8Array([0x49, 0x44, 0x33]), { tag: {} });
    expect.fail("expected writeMetadata to reject");
  } catch (error) {
    expect(isMmeError(error)).toBe(true);
    if (isMmeError(error)) {
      expect(error.code).toBe("unsupported-format");
      expect(error.message).toMatch(/no writer registered/i);
    }
  }
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
