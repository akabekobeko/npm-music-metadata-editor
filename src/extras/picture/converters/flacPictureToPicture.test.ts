import { describe, expect, it } from "vitest";
import { PictureKind } from "../../../types.js";
import { flacPictureToPicture } from "./flacPictureToPicture.js";
import { pictureToFlacPicture } from "./pictureToFlacPicture.js";

const sampleData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);

it("round-trips a picture through pictureToFlacPicture / flacPictureToPicture", () => {
  const original = {
    mimeType: "image/jpeg",
    kind: PictureKind.CoverFront,
    description: "Front cover",
    data: sampleData,
  } as const;
  const encoded = pictureToFlacPicture(original);
  expect(flacPictureToPicture(encoded)).toEqual(original);
});

it("preserves an empty description", () => {
  const original = {
    mimeType: "image/png",
    kind: PictureKind.Other,
    description: "",
    data: sampleData,
  } as const;
  const decoded = flacPictureToPicture(pictureToFlacPicture(original));
  expect(decoded?.description).toBe("");
});

describe("malformed inputs", () => {
  it("returns undefined for bodies smaller than the fixed prefix", () => {
    expect(flacPictureToPicture(new Uint8Array(16))).toBeUndefined();
  });

  it("returns undefined when a length field overruns the body", () => {
    const tooSmall = new Uint8Array(32);
    // Set mime length to a huge value to trigger the overrun guard.
    new DataView(tooSmall.buffer).setUint32(4, 0xffff, false);
    expect(flacPictureToPicture(tooSmall)).toBeUndefined();
  });
});
