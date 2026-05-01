import { describe, expect, it } from "vitest";
import { PictureKind } from "../../../types.js";
import { metadataBlockPictureToPicture } from "./metadataBlockPictureToPicture.js";
import { pictureToMetadataBlockPicture } from "./pictureToMetadataBlockPicture.js";

const sampleData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

it("round-trips a picture through the base64 envelope", () => {
  const original = {
    mimeType: "image/png",
    kind: PictureKind.CoverFront,
    description: "Cover",
    data: sampleData,
  } as const;
  const encoded = pictureToMetadataBlockPicture(original);
  const decoded = metadataBlockPictureToPicture(encoded);
  expect(decoded).toEqual(original);
});

it("ignores leading / trailing whitespace inside the base64 value", () => {
  const original = {
    mimeType: "image/jpeg",
    kind: PictureKind.Other,
    description: "",
    data: sampleData,
  } as const;
  const padded = `\n${pictureToMetadataBlockPicture(original)}\n`;
  expect(metadataBlockPictureToPicture(padded)).toEqual(original);
});

describe("malformed inputs", () => {
  it("returns undefined for an empty value", () => {
    expect(metadataBlockPictureToPicture("")).toBeUndefined();
  });

  it("returns undefined for non-base64 garbage", () => {
    expect(metadataBlockPictureToPicture("====")).toBeUndefined();
  });
});
