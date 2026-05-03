import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { ApeItemKind } from "../../../tags/ape/constants.js";
import type { ApeItem } from "../../../tags/ape/types.js";
import { PictureKind } from "../../../types.js";
import { apeBinaryItemToPicture } from "./apeBinaryItemToPicture.js";
import { pictureToApeBinaryItem } from "./pictureToApeBinaryItem.js";

const sampleData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

type BuildItemArgs = { key: string; filename: string; data: Uint8Array };

const buildItem = ({ key, filename, data }: BuildItemArgs): ApeItem => ({
  key,
  value: new Uint8Array(
    Buffer.concat([Buffer.from(filename, "latin1"), Uint8Array.of(0x00), data]),
  ),
  kind: ApeItemKind.Binary,
  readOnly: false,
});

it("decodes Cover Art (Front) into a CoverFront picture", () => {
  const item = buildItem({ key: "Cover Art (Front)", filename: "cover.jpg", data: sampleData });
  const picture = apeBinaryItemToPicture(item);
  expect(picture).toEqual({
    mimeType: "image/jpeg",
    kind: PictureKind.CoverFront,
    description: "cover.jpg",
    data: sampleData,
  });
});

it("falls back to detectMime when the filename has no extension", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const item = buildItem({ key: "Cover Art (Front)", filename: "noextension", data: png });
  expect(apeBinaryItemToPicture(item)?.mimeType).toBe("image/png");
});

it("returns undefined for non-binary items", () => {
  const textItem: ApeItem = {
    key: "Cover Art (Front)",
    value: "image/jpeg",
    kind: ApeItemKind.Text,
    readOnly: false,
  };
  expect(apeBinaryItemToPicture(textItem)).toBeUndefined();
});

describe("pictureToApeBinaryItem", () => {
  it("round-trips a picture", () => {
    const original = {
      mimeType: "image/png",
      kind: PictureKind.CoverBack,
      description: "back.png",
      data: sampleData,
    } as const;
    const encoded = pictureToApeBinaryItem(original);
    const decoded = apeBinaryItemToPicture(encoded);
    expect(decoded).toEqual(original);
  });

  it("synthesizes a filename when the picture has no description", () => {
    const item = pictureToApeBinaryItem({
      mimeType: "image/jpeg",
      kind: PictureKind.CoverFront,
      data: sampleData,
    });
    if (!(item.value instanceof Uint8Array)) {
      throw new Error("expected binary item");
    }

    const terminator = item.value.indexOf(0x00);
    expect(Buffer.from(item.value.subarray(0, terminator)).toString("latin1")).toBe("cover.jpg");
  });
});
