import { expect, it } from "vitest";
import { sanitizePictures } from "./sanitizePictures.js";

it("replaces data with byteLength", () => {
  const result = sanitizePictures([
    {
      mimeType: "image/jpeg",
      kind: 3,
      description: "front",
      data: new Uint8Array([1, 2, 3, 4, 5]),
    },
  ]);
  expect(result).toEqual([
    { mimeType: "image/jpeg", kind: 3, description: "front", byteLength: 5 },
  ]);
});

it("omits description when the source had none", () => {
  const result = sanitizePictures([{ mimeType: "image/png", kind: 0, data: new Uint8Array(2) }]);
  expect(result).toEqual([{ mimeType: "image/png", kind: 0, byteLength: 2 }]);
});

it("returns an empty array for empty input", () => {
  expect(sanitizePictures([])).toEqual([]);
});
