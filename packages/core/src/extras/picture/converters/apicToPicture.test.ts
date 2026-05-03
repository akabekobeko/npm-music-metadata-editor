import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { PictureKind } from "../../../types.js";
import { apicToPicture } from "./apicToPicture.js";
import { pictureToApic } from "./pictureToApic.js";

const sampleData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);

it("decodes a Latin-1 APIC body", () => {
  const body = Buffer.concat([
    Uint8Array.of(0x00),
    Buffer.from("image/jpeg", "latin1"),
    Uint8Array.of(0x00),
    Uint8Array.of(PictureKind.CoverFront),
    Buffer.from("Cover", "latin1"),
    Uint8Array.of(0x00),
    sampleData,
  ]);
  const picture = apicToPicture(new Uint8Array(body));
  expect(picture).toEqual({
    mimeType: "image/jpeg",
    kind: PictureKind.CoverFront,
    description: "Cover",
    data: sampleData,
  });
});

it("decodes a UTF-16 APIC body with a 2-byte description terminator", () => {
  const description = Buffer.from("Cover", "utf16le");
  const bom = Uint8Array.of(0xff, 0xfe);
  const body = Buffer.concat([
    Uint8Array.of(0x01),
    Buffer.from("image/png", "latin1"),
    Uint8Array.of(0x00),
    Uint8Array.of(PictureKind.CoverBack),
    bom,
    description,
    Uint8Array.of(0x00, 0x00),
    sampleData,
  ]);
  const picture = apicToPicture(new Uint8Array(body));
  expect(picture).toEqual({
    mimeType: "image/png",
    kind: PictureKind.CoverBack,
    description: "Cover",
    data: sampleData,
  });
});

it("treats an empty MIME field as image/jpeg per the spec", () => {
  const body = Buffer.concat([
    Uint8Array.of(0x00),
    Uint8Array.of(0x00),
    Uint8Array.of(PictureKind.Other),
    Uint8Array.of(0x00),
    sampleData,
  ]);
  const picture = apicToPicture(new Uint8Array(body));
  expect(picture?.mimeType).toBe("image/jpeg");
});

describe("malformed inputs", () => {
  it("returns undefined when the body is too short", () => {
    expect(apicToPicture(new Uint8Array([0x00, 0x00]))).toBeUndefined();
  });

  it("returns undefined when the encoding byte is unknown", () => {
    expect(apicToPicture(new Uint8Array([0x09, 0x00, 0x00, 0x00]))).toBeUndefined();
  });

  it("returns undefined when the MIME terminator is missing", () => {
    expect(apicToPicture(new Uint8Array([0x00, 0x69, 0x6d, 0x67]))).toBeUndefined();
  });
});

it("round-trips through pictureToApic", () => {
  const original = {
    mimeType: "image/png",
    kind: PictureKind.CoverFront,
    description: "Front",
    data: sampleData,
  } as const;
  const encoded = pictureToApic({ picture: original, encoding: "utf8" });
  const decoded = apicToPicture(encoded);
  expect(decoded).toEqual(original);
});
