import { describe, expect, it } from "vitest";
import { PictureKind } from "../../../types.js";
import { pictureToWmPicture } from "./pictureToWmPicture.js";
import { wmPictureToPicture } from "./wmPictureToPicture.js";

const sampleData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);

it("round-trips a picture with description", () => {
  const original = {
    mimeType: "image/jpeg",
    kind: PictureKind.CoverFront,
    description: "Front",
    data: sampleData,
  } as const;
  const decoded = wmPictureToPicture(pictureToWmPicture(original));
  expect(decoded).toEqual(original);
});

it("round-trips a picture without description", () => {
  const original = {
    mimeType: "image/png",
    kind: PictureKind.CoverBack,
    data: sampleData,
  } as const;
  const decoded = wmPictureToPicture(pictureToWmPicture(original));
  expect(decoded).toEqual(original);
});

describe("malformed inputs", () => {
  it("returns undefined when the body is too short for the fixed prefix", () => {
    expect(wmPictureToPicture(new Uint8Array(3))).toBeUndefined();
  });

  it("returns undefined when the MIME terminator is missing", () => {
    // Just the prefix + a non-terminated MIME — no UTF-16 null pair anywhere.
    const bytes = new Uint8Array([0x03, 0x00, 0x00, 0x00, 0x00, 0x69, 0x00]);
    expect(wmPictureToPicture(bytes)).toBeUndefined();
  });
});
