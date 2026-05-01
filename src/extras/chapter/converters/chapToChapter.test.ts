import { describe, expect, it } from "vitest";
import { PictureKind } from "../../../types.js";
import { chapToChapter } from "./chapToChapter.js";
import { chapterToChap } from "./chapterToChap.js";

const sampleData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

it("round-trips a chapter with title, url, and picture", () => {
  const original = {
    id: "chp1",
    startMs: 1000,
    endMs: 5000,
    title: "Intro",
    url: "https://example.com/intro",
    picture: {
      mimeType: "image/jpeg",
      kind: PictureKind.CoverFront,
      description: "Cover",
      data: sampleData,
    },
  } as const;
  const frame = chapterToChap({ chapter: original, majorVersion: 4 });
  expect(frame.id).toBe("CHAP");
  const decoded = chapToChapter({ body: frame.data, majorVersion: 4 });
  expect(decoded).toEqual(original);
});

it("round-trips a minimal chapter (no sub-frames)", () => {
  const original = { id: "chp", startMs: 0, endMs: 1000 } as const;
  const frame = chapterToChap({ chapter: original, majorVersion: 3 });
  const decoded = chapToChapter({ body: frame.data, majorVersion: 3 });
  expect(decoded).toEqual(original);
});

describe("malformed inputs", () => {
  it("returns undefined when the body has no element-ID terminator", () => {
    expect(chapToChapter({ body: new Uint8Array([0x68, 0x69]), majorVersion: 4 })).toBeUndefined();
  });

  it("returns undefined when the body is too short for the timestamp block", () => {
    const bytes = new Uint8Array([0x68, 0x00, 0x00, 0x00]);
    expect(chapToChapter({ body: bytes, majorVersion: 4 })).toBeUndefined();
  });
});
