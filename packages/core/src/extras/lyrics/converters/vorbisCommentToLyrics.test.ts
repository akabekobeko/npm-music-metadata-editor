import { expect, it } from "vitest";
import type { VorbisComment } from "../../../tags/vorbisComment/types.js";
import { lyricsToVorbisComment } from "./lyricsToVorbisComment.js";
import { vorbisCommentToLyrics } from "./vorbisCommentToLyrics.js";

it("decodes synchronized LRC lyrics", () => {
  const comment: VorbisComment = {
    vendor: "test",
    comments: [{ key: "LYRICS", value: "[00:01.00]Hello\n[00:02.00]World" }],
  };
  const lyrics = vorbisCommentToLyrics(comment);
  expect(lyrics?.synchronized).toEqual([
    { timeMs: 1000, text: "Hello" },
    { timeMs: 2000, text: "World" },
  ]);
});

it("falls back to unsynchronized for plain text", () => {
  const comment: VorbisComment = {
    vendor: "test",
    comments: [{ key: "LYRICS", value: "Plain text" }],
  };
  expect(vorbisCommentToLyrics(comment)?.unsynchronized).toBe("Plain text");
});

it("recognises UNSYNCEDLYRICS as an alias", () => {
  const comment: VorbisComment = {
    vendor: "test",
    comments: [{ key: "UNSYNCEDLYRICS", value: "Plain" }],
  };
  expect(vorbisCommentToLyrics(comment)).not.toBeUndefined();
});

it("returns undefined when no lyrics entry is present", () => {
  const comment: VorbisComment = {
    vendor: "test",
    comments: [{ key: "TITLE", value: "Song" }],
  };
  expect(vorbisCommentToLyrics(comment)).toBeUndefined();
});

it("re-encodes synchronized lyrics back through lyricsToVorbisComment", () => {
  const lyrics = {
    synchronized: [
      { timeMs: 1000, text: "Hello" },
      { timeMs: 2000, text: "World" },
    ],
    unsynchronized: "[00:01.00]Hello\n[00:02.00]World",
  } as const;
  const entry = lyricsToVorbisComment(lyrics);
  expect(entry?.key).toBe("LYRICS");
});
