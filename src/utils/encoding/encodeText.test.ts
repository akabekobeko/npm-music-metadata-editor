import { expect, it } from "vitest";
import { encodeText } from "./encodeText.js";

it("emits a leading 0xFFFE BOM for utf16", () => {
  const bytes = encodeText("AB", "utf16");
  expect(bytes[0]).toBe(0xff);
  expect(bytes[1]).toBe(0xfe);
  expect(bytes.length).toBe(2 + "AB".length * 2);
});

it("emits raw UTF-16BE bytes (no BOM)", () => {
  const bytes = encodeText("AB", "utf16be");
  // 'A' = 0x0041, 'B' = 0x0042
  expect(Array.from(bytes)).toEqual([0x00, 0x41, 0x00, 0x42]);
});

it("emits Latin-1 bytes for the latin1 encoding", () => {
  const bytes = encodeText("café", "latin1");
  // c=0x63 a=0x61 f=0x66 é=0xE9
  expect(Array.from(bytes)).toEqual([0x63, 0x61, 0x66, 0xe9]);
});
