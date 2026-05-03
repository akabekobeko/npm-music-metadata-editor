import { expect, it } from "vitest";
import { ASF_DESCRIPTOR_TYPE, ASF_GUID } from "../constants.js";
import { readExtendedContentDescription } from "./readExtendedContentDescription.js";
import { writeExtendedContentDescription } from "./writeExtendedContentDescription.js";

it("round-trips descriptors of every supported type", () => {
  const original = [
    {
      name: "WM/AlbumTitle",
      type: ASF_DESCRIPTOR_TYPE.UnicodeString,
      value: "Album",
      rawValue: new Uint8Array(),
    },
    {
      name: "WM/Year",
      type: ASF_DESCRIPTOR_TYPE.UnicodeString,
      value: "2026",
      rawValue: new Uint8Array(),
    },
    {
      name: "WM/TrackNumber",
      type: ASF_DESCRIPTOR_TYPE.Dword,
      value: 7,
      rawValue: new Uint8Array(),
    },
    {
      name: "WM/SharedUserRating",
      type: ASF_DESCRIPTOR_TYPE.Dword,
      value: 75,
      rawValue: new Uint8Array(),
    },
    {
      name: "Bitrate64",
      type: ASF_DESCRIPTOR_TYPE.Qword,
      value: 1234567890n,
      rawValue: new Uint8Array(),
    },
    {
      name: "WM/IsCompilation",
      type: ASF_DESCRIPTOR_TYPE.Bool,
      value: true,
      rawValue: new Uint8Array(),
    },
    {
      name: "TestWord",
      type: ASF_DESCRIPTOR_TYPE.Word,
      value: 0x1234,
      rawValue: new Uint8Array(),
    },
    {
      name: "TestGuid",
      type: ASF_DESCRIPTOR_TYPE.Guid,
      value: ASF_GUID.HeaderObject,
      rawValue: new Uint8Array(),
    },
    {
      name: "Picture",
      type: ASF_DESCRIPTOR_TYPE.ByteArray,
      value: Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]),
      rawValue: Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]),
    },
  ] as const;

  const bytes = writeExtendedContentDescription(original);
  const decoded = readExtendedContentDescription(bytes);

  expect(decoded).toHaveLength(original.length);
  expect(decoded.map((d) => [d.name, d.type, d.value])).toEqual(
    original.map((d) => [d.name, d.type, d.value]),
  );
});

it("returns an empty array when the count is zero", () => {
  const bytes = writeExtendedContentDescription([]);
  expect(readExtendedContentDescription(bytes)).toEqual([]);
});

it("stops gracefully on truncated payloads", () => {
  // Declare 1 descriptor but supply only the count.
  const truncated = new Uint8Array([0x01, 0x00]);
  expect(readExtendedContentDescription(truncated)).toEqual([]);
});
