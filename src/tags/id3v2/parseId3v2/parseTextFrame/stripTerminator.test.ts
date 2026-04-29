import { expect, it } from "vitest";
import { stripTerminator } from "./stripTerminator.js";

it("strips a single trailing 0x00 for single-byte encodings", () => {
  const input = new Uint8Array([0x41, 0x42, 0x00]);
  expect(Array.from(stripTerminator(input, "latin1"))).toEqual([0x41, 0x42]);
});

it("strips multiple trailing 0x00 bytes for single-byte encodings", () => {
  const input = new Uint8Array([0x41, 0x00, 0x00, 0x00]);
  expect(Array.from(stripTerminator(input, "utf8"))).toEqual([0x41]);
});

it("returns the input unchanged when no terminator is present (single-byte)", () => {
  const input = new Uint8Array([0x41, 0x42]);
  expect(stripTerminator(input, "latin1")).toEqual(input);
});

it("strips a 2-byte 0x00 0x00 terminator for utf16le", () => {
  const input = new Uint8Array([0x41, 0x00, 0x42, 0x00, 0x00, 0x00]);
  expect(Array.from(stripTerminator(input, "utf16le"))).toEqual([0x41, 0x00, 0x42, 0x00]);
});

it("does not strip a single 0x00 byte that is not part of an aligned pair (utf16)", () => {
  // Last two bytes are 0x42 0x00 — that's a UTF-16 code unit (0x0042), not a terminator.
  const input = new Uint8Array([0x41, 0x00, 0x42, 0x00]);
  expect(Array.from(stripTerminator(input, "utf16le"))).toEqual([0x41, 0x00, 0x42, 0x00]);
});

it("returns an empty view when the input is fully terminator bytes", () => {
  expect(stripTerminator(new Uint8Array([0x00, 0x00]), "latin1").length).toBe(0);
  expect(stripTerminator(new Uint8Array([0x00, 0x00]), "utf16le").length).toBe(0);
});
