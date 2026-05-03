import { expect, it } from "vitest";
import { ASF_DESCRIPTOR_TYPE } from "../constants.js";
import { descriptorsToTagData } from "./descriptorsToTagData.js";

it("merges Content Description text fields onto TagData", () => {
  const tag = descriptorsToTagData({
    content: {
      title: "Title",
      author: "Author",
      copyright: "© 2026",
      description: "A comment",
      rating: "",
    },
    extended: [],
  });
  expect(tag).toEqual({
    title: "Title",
    artist: "Author",
    copyright: "© 2026",
    comment: "A comment",
  });
});

it("decodes WM/* descriptors of common types", () => {
  const tag = descriptorsToTagData({
    content: undefined,
    extended: [
      {
        name: "WM/AlbumTitle",
        type: ASF_DESCRIPTOR_TYPE.UnicodeString,
        value: "Album",
        rawValue: new Uint8Array(),
      },
      {
        name: "WM/TrackNumber",
        type: ASF_DESCRIPTOR_TYPE.UnicodeString,
        value: "3/8",
        rawValue: new Uint8Array(),
      },
      {
        name: "WM/Year",
        type: ASF_DESCRIPTOR_TYPE.UnicodeString,
        value: "2026",
        rawValue: new Uint8Array(),
      },
      {
        name: "WM/SharedUserRating",
        type: ASF_DESCRIPTOR_TYPE.Dword,
        value: 99,
        rawValue: new Uint8Array(),
      },
    ],
  });
  expect(tag).toMatchObject({
    album: "Album",
    trackNumber: 3,
    trackTotal: 8,
    year: 2026,
    rating: 1,
  });
});
