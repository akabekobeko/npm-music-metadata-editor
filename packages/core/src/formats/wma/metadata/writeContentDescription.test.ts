import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { writeContentDescription } from "./writeContentDescription.js";

it("emits five 16-bit length fields followed by null-terminated UTF-16LE strings", () => {
  const bytes = writeContentDescription({
    title: "Hi",
    author: "",
    copyright: "",
    description: "",
    rating: "",
  });
  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // "Hi\0" in UTF-16LE = 6 bytes.
  expect(view.readUInt16LE(0)).toBe(6);
  expect(view.readUInt16LE(2)).toBe(0);
  expect(view.readUInt16LE(4)).toBe(0);
  expect(view.readUInt16LE(6)).toBe(0);
  expect(view.readUInt16LE(8)).toBe(0);
  // Strings region begins at byte 10.
  expect(view.subarray(10).equals(Buffer.from("Hi\0", "utf16le"))).toBe(true);
});

it("yields exactly the length table when every field is empty", () => {
  const bytes = writeContentDescription({
    title: "",
    author: "",
    copyright: "",
    description: "",
    rating: "",
  });
  expect(bytes).toEqual(new Uint8Array(10));
});
