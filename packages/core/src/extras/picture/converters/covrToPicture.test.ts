import { expect, it } from "vitest";
import { ItunesDataType } from "../../../formats/mp4/constants.js";
import type { ItunesAtom } from "../../../formats/mp4/types.js";
import { PictureKind } from "../../../types.js";
import { covrToPicture } from "./covrToPicture.js";
import { pictureToCovr } from "./pictureToCovr.js";

const sampleData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

it("decodes a single covr value", () => {
  const atom: ItunesAtom = {
    name: "covr",
    values: [{ typeIndicator: ItunesDataType.Jpeg, locale: 0, data: sampleData }],
  };
  const pictures = covrToPicture(atom);
  expect(pictures).toEqual([
    { mimeType: "image/jpeg", kind: PictureKind.CoverFront, data: sampleData },
  ]);
});

it("decodes every value when covr carries multiple images", () => {
  const atom: ItunesAtom = {
    name: "covr",
    values: [
      { typeIndicator: ItunesDataType.Jpeg, locale: 0, data: sampleData },
      { typeIndicator: ItunesDataType.Png, locale: 0, data: sampleData },
    ],
  };
  expect(covrToPicture(atom)).toHaveLength(2);
});

it("falls back to detectMime when the indicator is unknown", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const atom: ItunesAtom = {
    name: "covr",
    values: [{ typeIndicator: ItunesDataType.Implicit, locale: 0, data: png }],
  };
  expect(covrToPicture(atom)[0]?.mimeType).toBe("image/png");
});

it("round-trips through pictureToCovr", () => {
  const pictures = [
    { mimeType: "image/png", kind: PictureKind.CoverFront, data: sampleData },
    { mimeType: "image/jpeg", kind: PictureKind.CoverFront, data: sampleData },
  ];
  const atom = pictureToCovr(pictures);
  expect(atom).toBeDefined();
  if (atom === undefined) {
    return;
  }

  const decoded = covrToPicture(atom);
  expect(decoded.map((p) => p.mimeType)).toEqual(["image/png", "image/jpeg"]);
});

it("returns undefined when every picture has empty data", () => {
  expect(
    pictureToCovr([
      { mimeType: "image/png", kind: PictureKind.CoverFront, data: new Uint8Array() },
    ]),
  ).toBeUndefined();
});
