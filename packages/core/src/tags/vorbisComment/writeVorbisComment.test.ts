import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { readVorbisComment } from "./readVorbisComment.js";
import { writeVorbisComment } from "./writeVorbisComment.js";

it("emits vendor + count + entries in little-endian length-prefixed form", () => {
  const bytes = writeVorbisComment({
    vendor: "x",
    comments: [{ key: "TITLE", value: "Hi" }],
  });
  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.readUInt32LE(0)).toBe(1); // vendor length
  expect(view.toString("utf8", 4, 5)).toBe("x");
  expect(view.readUInt32LE(5)).toBe(1); // comment count
  expect(view.readUInt32LE(9)).toBe("TITLE=Hi".length);
  expect(view.toString("utf8", 13, 13 + "TITLE=Hi".length)).toBe("TITLE=Hi");
});

it("writes an empty vendor and zero comments", () => {
  const bytes = writeVorbisComment({ vendor: "", comments: [] });
  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.length).toBe(8);
  expect(view.readUInt32LE(0)).toBe(0);
  expect(view.readUInt32LE(4)).toBe(0);
});

it("encodes UTF-8 multi-byte values correctly", () => {
  const bytes = writeVorbisComment({
    vendor: "ヴェンダー",
    comments: [{ key: "ARTIST", value: "アーティスト" }],
  });
  const decoded = readVorbisComment(bytes);
  expect(decoded.vendor).toBe("ヴェンダー");
  expect(decoded.comments[0]).toEqual({ key: "ARTIST", value: "アーティスト" });
});

it("rejects keys that contain '='", () => {
  expect(() =>
    writeVorbisComment({
      vendor: "v",
      comments: [{ key: "BAD=KEY", value: "x" }],
    }),
  ).toThrow(/illegal byte/);
});

it("rejects empty keys", () => {
  expect(() =>
    writeVorbisComment({
      vendor: "v",
      comments: [{ key: "", value: "x" }],
    }),
  ).toThrow(/empty key/);
});

it("preserves multi-value entries in input order", () => {
  const tag = {
    vendor: "v",
    comments: [
      { key: "ARTIST", value: "A" },
      { key: "ARTIST", value: "B" },
      { key: "TITLE", value: "T" },
    ],
  };
  const decoded = readVorbisComment(writeVorbisComment(tag));
  expect(decoded.comments).toEqual(tag.comments);
});
