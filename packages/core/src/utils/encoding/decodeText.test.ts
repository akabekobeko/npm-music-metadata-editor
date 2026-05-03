import { expect, it } from "vitest";
import { decodeText } from "./decodeText.js";
import { encodeText } from "./encodeText.js";
import type { TextEncoding } from "./types.js";

const samples: Array<{ encoding: TextEncoding; value: string }> = [
  { encoding: "ascii", value: "Hello" },
  { encoding: "latin1", value: "café" },
  { encoding: "utf8", value: "音楽 — música" },
  { encoding: "utf16le", value: "音楽" },
  { encoding: "utf16be", value: "音楽" },
  { encoding: "utf16", value: "音楽" },
];

it.each(samples)("round-trips $encoding through encodeText / decodeText", ({ encoding, value }) => {
  const bytes = encodeText(value, encoding);
  expect(decodeText(bytes, encoding)).toBe(value);
});

it("decodes a UTF-16BE BOM-prefixed payload", () => {
  const bytes = new Uint8Array([0xfe, 0xff, 0x00, 0x41, 0x00, 0x42]);
  expect(decodeText(bytes, "utf16")).toBe("AB");
});

it("decodes a UTF-16LE BOM-prefixed payload", () => {
  const bytes = new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0x42, 0x00]);
  expect(decodeText(bytes, "utf16")).toBe("AB");
});

it("falls back to little-endian when no BOM is present", () => {
  const bytes = new Uint8Array([0x41, 0x00, 0x42, 0x00]);
  expect(decodeText(bytes, "utf16")).toBe("AB");
});
