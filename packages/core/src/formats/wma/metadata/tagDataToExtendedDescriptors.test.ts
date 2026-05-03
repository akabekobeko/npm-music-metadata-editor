import { expect, it } from "vitest";
import { ASF_DESCRIPTOR_TYPE } from "../constants.js";
import { tagDataToExtendedDescriptors } from "./tagDataToExtendedDescriptors.js";

it("preserves descriptors not managed by this writer", () => {
  const result = tagDataToExtendedDescriptors({
    tag: { album: "New" },
    existing: [
      {
        name: "WM/AlbumTitle",
        type: ASF_DESCRIPTOR_TYPE.UnicodeString,
        value: "Old",
        rawValue: Uint8Array.from([1, 2]),
      },
      {
        name: "WM/Mood",
        type: ASF_DESCRIPTOR_TYPE.UnicodeString,
        value: "Calm",
        rawValue: Uint8Array.from([0xaa, 0xbb]),
      },
    ],
  });
  expect(result.map((d) => d.name)).toEqual(["WM/Mood", "WM/AlbumTitle"]);
  expect(result[1]?.value).toBe("New");
});

it("emits track / disc as X/Y strings", () => {
  const result = tagDataToExtendedDescriptors({
    tag: { trackNumber: 4, trackTotal: 12, discNumber: 1 },
    existing: [],
  });
  const track = result.find((d) => d.name === "WM/TrackNumber");
  const disc = result.find((d) => d.name === "WM/PartOfSet");
  expect(track?.value).toBe("4/12");
  expect(disc?.value).toBe("1");
});

it("falls back to existing managed values for fields the caller omitted", () => {
  const result = tagDataToExtendedDescriptors({
    tag: { album: "New album" },
    existing: [
      {
        name: "WM/Composer",
        type: ASF_DESCRIPTOR_TYPE.UnicodeString,
        value: "Existing composer",
        rawValue: new Uint8Array(),
      },
    ],
  });
  const composer = result.find((d) => d.name === "WM/Composer");
  expect(composer?.value).toBe("Existing composer");
});
