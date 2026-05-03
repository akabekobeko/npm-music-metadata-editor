import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { detectWavSignature } from "./detectWav.js";

const buildHeader = (magic: string, formType: string): Uint8Array => {
  const out = Buffer.alloc(12);
  out.write(magic, 0, 4, "latin1");
  out.writeUInt32LE(0, 4);
  out.write(formType, 8, 4, "latin1");
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

it("returns true for a RIFF/WAVE header", () => {
  expect(detectWavSignature(buildHeader("RIFF", "WAVE"))).toBe(true);
});

it("returns false when the magic is not RIFF", () => {
  expect(detectWavSignature(buildHeader("RIFX", "WAVE"))).toBe(false);
  expect(detectWavSignature(buildHeader("RF64", "WAVE"))).toBe(false);
});

it("returns false when the form type is not WAVE", () => {
  expect(detectWavSignature(buildHeader("RIFF", "AVI "))).toBe(false);
});

it("returns false for buffers smaller than 12 bytes", () => {
  expect(detectWavSignature(new Uint8Array(8))).toBe(false);
});
