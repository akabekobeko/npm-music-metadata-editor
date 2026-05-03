import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { ItunesDataType } from "../../../formats/mp4/constants.js";
import type { ItunesAtom } from "../../../formats/mp4/types.js";
import { lyricsToMp4Lyr } from "./lyricsToMp4Lyr.js";
import { mp4LyrToLyrics } from "./mp4LyrToLyrics.js";

it("decodes a plain-text ©lyr atom", () => {
  const atom: ItunesAtom = {
    name: "©lyr",
    values: [
      {
        typeIndicator: ItunesDataType.Utf8,
        locale: 0,
        data: new Uint8Array(Buffer.from("Plain lyrics", "utf8")),
      },
    ],
  };
  expect(mp4LyrToLyrics(atom)?.unsynchronized).toBe("Plain lyrics");
});

it("decodes an LRC ©lyr atom into synchronized lyrics", () => {
  const atom: ItunesAtom = {
    name: "©lyr",
    values: [
      {
        typeIndicator: ItunesDataType.Utf8,
        locale: 0,
        data: new Uint8Array(Buffer.from("[00:01.00]Hello\n[00:02.00]World", "utf8")),
      },
    ],
  };
  expect(mp4LyrToLyrics(atom)?.synchronized).toEqual([
    { timeMs: 1000, text: "Hello" },
    { timeMs: 2000, text: "World" },
  ]);
});

it("returns undefined for an atom with no values", () => {
  expect(mp4LyrToLyrics({ name: "©lyr", values: [] })).toBeUndefined();
});

it("encodes synchronized lyrics back through lyricsToMp4Lyr", () => {
  const atom = lyricsToMp4Lyr({
    synchronized: [
      { timeMs: 1000, text: "Hello" },
      { timeMs: 2000, text: "World" },
    ],
  });
  expect(atom?.name).toBe("©lyr");
  const round = mp4LyrToLyrics(atom as ItunesAtom);
  expect(round?.synchronized).toEqual([
    { timeMs: 1000, text: "Hello" },
    { timeMs: 2000, text: "World" },
  ]);
});
