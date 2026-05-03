import { expect, it } from "vitest";
import type { Id3v2Frame } from "../types.js";
import { buildId3v2 } from "./buildId3v2.js";

const NO_FLAGS = {
  tagAlterPreservation: false,
  fileAlterPreservation: false,
  readOnly: false,
  groupingIdentity: false,
  compression: false,
  encryption: false,
  unsynchronization: false,
  dataLengthIndicator: false,
} as const;

const frame = (id: string, body: number[]): Id3v2Frame => ({
  id,
  flags: NO_FLAGS,
  data: new Uint8Array(body),
});

it("emits header + frames in order with no padding by default", () => {
  const bytes = buildId3v2({
    majorVersion: 4,
    frames: [frame("AAAA", [1, 2]), frame("BBBB", [3])],
  });
  // Header is 10 bytes; AAAA frame = 10+2 = 12; BBBB frame = 10+1 = 11. Total 33.
  expect(bytes.length).toBe(33);
  // After the header, the first frame ID bytes appear.
  expect(Array.from(bytes.subarray(10, 14))).toEqual([0x41, 0x41, 0x41, 0x41]);
  // The body of AAAA (1,2) sits right after its header.
  expect(Array.from(bytes.subarray(20, 22))).toEqual([1, 2]);
  // BBBB starts immediately after AAAA.
  expect(Array.from(bytes.subarray(22, 26))).toEqual([0x42, 0x42, 0x42, 0x42]);
});

it("appends padding zero bytes when requested", () => {
  const bytes = buildId3v2({
    majorVersion: 3,
    frames: [frame("AAAA", [1])],
    padding: 16,
  });
  // 10 (header) + 11 (frame) + 16 (padding) = 37.
  expect(bytes.length).toBe(37);
  // Last 16 bytes are all zero.
  expect(Array.from(bytes.subarray(21, 37))).toEqual(Array.from({ length: 16 }, () => 0));
});

it("rejects negative padding", () => {
  expect(() => buildId3v2({ majorVersion: 4, frames: [], padding: -1 })).toThrow(RangeError);
});

it("rejects non-integer padding", () => {
  expect(() => buildId3v2({ majorVersion: 4, frames: [], padding: 1.5 })).toThrow(RangeError);
});

it("emits a header + zero-byte body for empty frame list", () => {
  const bytes = buildId3v2({ majorVersion: 4, frames: [] });
  expect(bytes.length).toBe(10);
});
