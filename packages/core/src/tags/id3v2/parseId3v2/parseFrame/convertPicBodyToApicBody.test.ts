import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { convertPicBodyToApicBody } from "./convertPicBodyToApicBody.js";

const buildPicBody = (format: string, tail: readonly number[]): Uint8Array =>
  new Uint8Array(
    Buffer.concat([Uint8Array.of(0x00), Buffer.from(format, "latin1"), Uint8Array.of(...tail)]),
  );

// kind + empty description terminator + 2 data bytes
const TAIL = [0x03, 0x00, 0xff, 0xd8];

it("rewrites the 3-char PNG format into a NUL-terminated MIME string", () => {
  const out = convertPicBodyToApicBody(buildPicBody("PNG", TAIL));
  const expected = Buffer.concat([
    Uint8Array.of(0x00),
    Buffer.from("image/png", "latin1"),
    Uint8Array.of(0x00),
    Uint8Array.of(...TAIL),
  ]);
  expect(Array.from(out)).toEqual(Array.from(expected));
});

it("maps JPG to image/jpeg", () => {
  const out = convertPicBodyToApicBody(buildPicBody("JPG", TAIL));
  expect(Buffer.from(out.subarray(1, 11)).toString("latin1")).toBe("image/jpeg");
});

it("maps a lowercase format case-insensitively", () => {
  const out = convertPicBodyToApicBody(buildPicBody("png", TAIL));
  expect(Buffer.from(out.subarray(1, 10)).toString("latin1")).toBe("image/png");
});

it("keeps the --> sentinel for linked pictures", () => {
  const out = convertPicBodyToApicBody(buildPicBody("-->", TAIL));
  expect(Buffer.from(out.subarray(1, 4)).toString("latin1")).toBe("-->");
  expect(out[4]).toBe(0x00);
});

it("turns an unknown format into image/<format>", () => {
  const out = convertPicBodyToApicBody(buildPicBody("XYZ", TAIL));
  expect(Buffer.from(out.subarray(1, 10)).toString("latin1")).toBe("image/xyz");
});

it("emits an empty MIME when the format bytes are NUL padding", () => {
  const out = convertPicBodyToApicBody(buildPicBody("\0\0\0", TAIL));
  expect(out[1]).toBe(0x00);
  expect(Array.from(out.subarray(2))).toEqual(TAIL);
});

it("returns a too-short body unchanged", () => {
  const body = new Uint8Array([0x00, 0x50, 0x4e]);
  expect(convertPicBodyToApicBody(body)).toBe(body);
});
