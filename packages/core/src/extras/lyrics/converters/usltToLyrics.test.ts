import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { lyricsToUslt } from "./lyricsToUslt.js";
import { usltToLyrics } from "./usltToLyrics.js";

it("decodes a Latin-1 USLT body", () => {
  const body = Buffer.concat([
    Uint8Array.of(0x00),
    Buffer.from("eng", "latin1"),
    Buffer.from("Lyrics", "latin1"),
    Uint8Array.of(0x00),
    Buffer.from("First line\nSecond line", "latin1"),
  ]);
  const lyrics = usltToLyrics(new Uint8Array(body));
  expect(lyrics).toEqual({
    language: "eng",
    description: "Lyrics",
    unsynchronized: "First line\nSecond line",
  });
});

it("round-trips through lyricsToUslt", () => {
  const original = {
    language: "eng",
    description: "Lyrics",
    unsynchronized: "Hello\nWorld",
  } as const;
  const body = lyricsToUslt({ lyrics: original, encoding: "utf8" });
  expect(body).toBeDefined();
  expect(usltToLyrics(body as Uint8Array)).toEqual(original);
});

it("returns undefined when the lyrics have no plain-text payload", () => {
  expect(lyricsToUslt({ lyrics: { synchronized: [{ timeMs: 0, text: "x" }] } })).toBeUndefined();
});

it("returns undefined for malformed USLT bodies", () => {
  expect(usltToLyrics(new Uint8Array([0x00, 0x65]))).toBeUndefined();
});
