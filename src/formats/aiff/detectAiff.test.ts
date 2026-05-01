import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { detectAiffSignature } from "./detectAiff.js";

const buildHeader = (magic: string, formType: string): Uint8Array => {
  const out = Buffer.alloc(12);
  out.write(magic, 0, 4, "latin1");
  out.writeUInt32BE(0, 4);
  out.write(formType, 8, 4, "latin1");
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

it("returns true for a FORM/AIFF header", () => {
  expect(detectAiffSignature(buildHeader("FORM", "AIFF"))).toBe(true);
});

it("returns true for a FORM/AIFC header", () => {
  expect(detectAiffSignature(buildHeader("FORM", "AIFC"))).toBe(true);
});

it("returns false when the magic is not FORM", () => {
  expect(detectAiffSignature(buildHeader("RIFF", "AIFF"))).toBe(false);
});

it("returns false when the form type is something other than AIFF/AIFC", () => {
  expect(detectAiffSignature(buildHeader("FORM", "AIFX"))).toBe(false);
});

it("returns false for buffers smaller than 12 bytes", () => {
  expect(detectAiffSignature(new Uint8Array(8))).toBe(false);
});
