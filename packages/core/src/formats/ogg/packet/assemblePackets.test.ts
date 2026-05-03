import { expect, it } from "vitest";
import type { OggPage } from "../types.js";
import { assemblePackets } from "./assemblePackets.js";

/**
 * Helper that constructs a {@link OggPage} with the minimum amount of
 * boilerplate. `headerType`, CRC, granule position and similar fields do not
 * affect packet assembly, so we leave them at zero.
 */
const makePage = (args: { segmentSizes: readonly number[]; payload: Uint8Array }): OggPage => ({
  version: 0,
  headerType: 0,
  granulePosition: 0n,
  serialNumber: 1,
  pageSequence: 0,
  crcChecksum: 0,
  segmentSizes: args.segmentSizes,
  payload: args.payload,
  pageStart: 0,
  pageSize: 27 + args.segmentSizes.length + args.payload.length,
});

it("returns a single packet for a single-segment page", () => {
  const page = makePage({ segmentSizes: [3], payload: Uint8Array.of(1, 2, 3) });
  const packets = assemblePackets([page]);
  expect(packets).toHaveLength(1);
  expect(Array.from(packets[0]?.data ?? [])).toEqual([1, 2, 3]);
});

it("merges segments across pages until a terminator (< 255) closes the packet", () => {
  // Total packet = 255 + 100 = 355 bytes split across two pages.
  const part0 = new Uint8Array(255).fill(0xaa);
  const part1 = new Uint8Array(100).fill(0xbb);
  const page0 = makePage({ segmentSizes: [255], payload: part0 });
  const page1 = makePage({ segmentSizes: [100], payload: part1 });
  const packets = assemblePackets([page0, page1]);
  expect(packets).toHaveLength(1);
  expect(packets[0]?.data.length).toBe(355);
  expect(packets[0]?.data[0]).toBe(0xaa);
  expect(packets[0]?.data[255]).toBe(0xbb);
  expect(packets[0]?.pageIndices).toEqual([0, 1]);
});

it("emits multiple packets when a single page contains multiple terminators", () => {
  // Page with two short packets back-to-back.
  const page = makePage({
    segmentSizes: [2, 3],
    payload: Uint8Array.of(0x10, 0x11, 0x20, 0x21, 0x22),
  });
  const packets = assemblePackets([page]);
  expect(packets).toHaveLength(2);
  expect(Array.from(packets[0]?.data ?? [])).toEqual([0x10, 0x11]);
  expect(Array.from(packets[1]?.data ?? [])).toEqual([0x20, 0x21, 0x22]);
});

it("treats a 255-byte segment followed by a zero-byte terminator as one 255-byte packet", () => {
  const page = makePage({ segmentSizes: [255, 0], payload: new Uint8Array(255).fill(0x77) });
  const packets = assemblePackets([page]);
  expect(packets).toHaveLength(1);
  expect(packets[0]?.data.length).toBe(255);
});
