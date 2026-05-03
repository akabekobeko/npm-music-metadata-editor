import { type PictureInfo, PictureKind } from "@akabeko/music-metadata-editor";
import { describe, expect, it } from "vitest";
import { pickPicture } from "./pickPicture.js";

const make = (kind: number, marker: number): PictureInfo => ({
  mimeType: "image/png",
  kind: kind as PictureInfo["kind"],
  data: new Uint8Array([marker]),
});

const pictures: readonly PictureInfo[] = [
  make(PictureKind.CoverFront, 1),
  make(PictureKind.CoverBack, 2),
  make(PictureKind.CoverFront, 3),
  make(PictureKind.LeadArtist, 4),
];

describe("pickPicture", () => {
  it("returns pictures[0] when no filter is set", () => {
    expect(pickPicture(pictures, {})?.data[0]).toBe(1);
  });

  it("returns the first picture matching --kind", () => {
    expect(pickPicture(pictures, { kind: PictureKind.CoverBack })?.data[0]).toBe(2);
  });

  it("respects --index without --kind", () => {
    expect(pickPicture(pictures, { index: 2 })?.data[0]).toBe(3);
  });

  it("combines --kind and --index over the filtered subset", () => {
    expect(pickPicture(pictures, { kind: PictureKind.CoverFront, index: 1 })?.data[0]).toBe(3);
  });

  it("returns undefined when the index is out of range", () => {
    expect(pickPicture(pictures, { index: 9 })).toBeUndefined();
  });

  it("returns undefined when no picture matches --kind", () => {
    expect(pickPicture(pictures, { kind: PictureKind.Band })).toBeUndefined();
  });

  it("returns undefined for an empty source", () => {
    expect(pickPicture([], {})).toBeUndefined();
  });
});
