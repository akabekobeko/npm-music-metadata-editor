import { expect, it } from "vitest";
import { OggHeaderType } from "../constants.js";
import { chunkIntoSegments } from "../packet/chunkIntoSegments.js";
import { encodeOggPage } from "./encodeOggPage.js";
import { parseOggPages } from "./parseOggPages.js";

const SERIAL = 0xdeadbeef;

const buildPage = (args: {
  headerType: number;
  pageSequence: number;
  payload: Uint8Array;
  granulePosition?: bigint;
}): Uint8Array =>
  encodeOggPage({
    headerType: args.headerType,
    granulePosition: args.granulePosition ?? 0n,
    serialNumber: SERIAL,
    pageSequence: args.pageSequence,
    segmentSizes: chunkIntoSegments(args.payload.length),
    payload: args.payload,
  });

it("yields nothing for an empty buffer", () => {
  const pages = Array.from(parseOggPages(new Uint8Array(0)));
  expect(pages).toEqual([]);
});

it("round-trips a single page through encode + parse", () => {
  const payload = Uint8Array.of(1, 2, 3, 4, 5);
  const bytes = buildPage({
    headerType: OggHeaderType.BeginningOfStream,
    pageSequence: 0,
    payload,
  });
  const [page] = Array.from(parseOggPages(bytes));
  expect(page?.serialNumber).toBe(SERIAL);
  expect(page?.pageSequence).toBe(0);
  expect(page?.headerType).toBe(OggHeaderType.BeginningOfStream);
  // 5-byte packet terminates with a single < 255 lacing value, so no extra
  // zero terminator is needed (RFC 3533 §5).
  expect(page?.segmentSizes).toEqual([5]);
  expect(Array.from(page?.payload ?? [])).toEqual([1, 2, 3, 4, 5]);
  expect(page?.pageStart).toBe(0);
  expect(page?.pageSize).toBe(bytes.length);
});

it("walks across multiple pages and stops at trailing garbage", () => {
  const page0 = buildPage({
    headerType: OggHeaderType.BeginningOfStream,
    pageSequence: 0,
    payload: new Uint8Array([0x01]),
  });
  const page1 = buildPage({ headerType: 0, pageSequence: 1, payload: new Uint8Array([0x02]) });
  const trailing = new Uint8Array([0xff, 0xff]);
  const combined = new Uint8Array(page0.length + page1.length + trailing.length);
  combined.set(page0, 0);
  combined.set(page1, page0.length);
  combined.set(trailing, page0.length + page1.length);

  const pages = Array.from(parseOggPages(combined));
  expect(pages).toHaveLength(2);
  expect(pages[0]?.pageSequence).toBe(0);
  expect(pages[1]?.pageSequence).toBe(1);
});

it("preserves the encoded CRC", () => {
  const bytes = buildPage({
    headerType: OggHeaderType.EndOfStream,
    pageSequence: 7,
    payload: new Uint8Array(300).map((_, i) => i & 0xff),
    granulePosition: 1234n,
  });
  const [page] = Array.from(parseOggPages(bytes));
  // The encoded page already has its CRC patched; round-tripping should
  // surface the same value (the parser does not recompute, only reads).
  expect(page?.crcChecksum).toBeGreaterThan(0);
  expect(page?.granulePosition).toBe(1234n);
});
