import { expect, it } from "vitest";
import { buildTextFrameBody } from "../buildId3v2/buildTextFrameBody.js";
import { id3v2TagToTagData } from "../id3v2TagToTagData/id3v2TagToTagData.js";
import { parseId3v2 } from "../parseId3v2/parseId3v2.js";
import { writeId3v2 } from "./writeId3v2.js";

const FRAME_FLAGS = {
  tagAlterPreservation: false,
  fileAlterPreservation: false,
  readOnly: false,
  groupingIdentity: false,
  compression: false,
  encryption: false,
  unsynchronization: false,
  dataLengthIndicator: false,
};

it.each([3, 4] as const)("round-trips v2.%d text fields", (majorVersion) => {
  const bytes = writeId3v2({
    majorVersion,
    tag: {
      title: "Title",
      artist: "Artist",
      album: "Album",
      year: 2024,
      trackNumber: 3,
      trackTotal: 11,
      discNumber: 1,
      discTotal: 2,
      comment: "A comment",
      genre: "Rock",
    },
  });
  const tag = parseId3v2(bytes);
  expect(tag).toBeDefined();
  expect(tag?.majorVersion).toBe(majorVersion);
  if (tag === undefined) throw new Error("tag should be defined");
  const data = id3v2TagToTagData(tag);
  expect(data).toEqual({
    title: "Title",
    artist: "Artist",
    album: "Album",
    year: 2024,
    trackNumber: 3,
    trackTotal: 11,
    discNumber: 1,
    discTotal: 2,
    comment: "A comment",
    genre: "Rock",
  });
});

it("preserves unknown frames passed via preserveFrames", () => {
  const unknown = {
    id: "TENC",
    flags: FRAME_FLAGS,
    data: buildTextFrameBody({ encoding: "utf8", text: "MMETest/1.0" }),
  };
  const bytes = writeId3v2({
    majorVersion: 4,
    tag: { title: "Hi" },
    preserveFrames: [unknown],
  });
  const tag = parseId3v2(bytes);
  const ids = tag?.frames.map((f) => f.id);
  expect(ids).toEqual(["TIT2", "TENC"]);
});

it("includes padding when requested", () => {
  const bytes = writeId3v2({
    majorVersion: 4,
    tag: { title: "Title" },
    padding: 64,
  });
  const tag = parseId3v2(bytes);
  expect(tag).toBeDefined();
  expect(tag?.totalSize).toBe(bytes.length);
});
