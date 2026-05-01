import { describe, expect, it } from "vitest";
import { lyricsToSylt } from "./lyricsToSylt.js";
import { syltToLyrics } from "./syltToLyrics.js";

it("round-trips synchronized lyrics through Latin-1 encoding", () => {
  const original = {
    language: "eng",
    description: "Lyrics",
    synchronized: [
      { timeMs: 1000, text: "First" },
      { timeMs: 2500, text: "Second" },
    ],
  } as const;
  const body = lyricsToSylt({ lyrics: original, encoding: "latin1" });
  expect(body).toBeDefined();
  expect(syltToLyrics(body as Uint8Array)).toEqual(original);
});

it("round-trips synchronized lyrics through UTF-16", () => {
  const original = {
    language: "eng",
    description: "Lyrics",
    synchronized: [
      { timeMs: 0, text: "Hello" },
      { timeMs: 1234, text: "World" },
    ],
  } as const;
  const body = lyricsToSylt({ lyrics: original, encoding: "utf16" });
  expect(body).toBeDefined();
  expect(syltToLyrics(body as Uint8Array)).toEqual(original);
});

describe("malformed inputs", () => {
  it("returns undefined when the body is too short", () => {
    expect(syltToLyrics(new Uint8Array(3))).toBeUndefined();
  });

  it("returns undefined for an unsupported time format", () => {
    // Encoding 0, language 'eng', time format 0x01 (MPEG frames) — unsupported.
    const bytes = new Uint8Array([
      0x00,
      0x65,
      0x6e,
      0x67, // language
      0x01, // time format = MPEG frames
      0x01, // content type = lyrics
      0x00, // description terminator
      0x4c,
      0x00,
      0x00,
      0x00,
      0x00,
      0x01, // text "L" + terminator + timestamp
    ]);
    expect(syltToLyrics(bytes)).toBeUndefined();
  });

  it("returns undefined when no synchronized records were captured", () => {
    // Header but no records at all.
    const bytes = new Uint8Array([0x00, 0x65, 0x6e, 0x67, 0x02, 0x01, 0x00]);
    expect(syltToLyrics(bytes)).toBeUndefined();
  });
});
