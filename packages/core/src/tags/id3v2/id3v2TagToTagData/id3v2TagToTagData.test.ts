import { expect, it } from "vitest";
import { buildPopularimeterFrameBody } from "../popularimeter/buildPopularimeterFrameBody.js";
import type { Id3v2Frame, Id3v2Tag } from "../types.js";
import { NO_FRAME_FLAGS } from "../writeId3v2/constants.js";
import { id3v2TagToTagData } from "./id3v2TagToTagData.js";

const popm = (rating: number, email = "x"): Id3v2Frame => ({
  id: "POPM",
  flags: NO_FRAME_FLAGS,
  data: buildPopularimeterFrameBody({ email, rating, counter: new Uint8Array(4) }),
});

const tagOf = (frames: readonly Id3v2Frame[]): Id3v2Tag => ({
  majorVersion: 3,
  revision: 0,
  flags: { unsynchronization: false, extendedHeader: false, experimental: false, footer: false },
  totalSize: 0,
  frames,
});

it("decodes the POPM rating byte using the Windows convention", () => {
  expect(id3v2TagToTagData(tagOf([popm(196)])).rating).toBeCloseTo(0.8, 10);
  expect(id3v2TagToTagData(tagOf([popm(1)])).rating).toBeCloseTo(0.2, 10);
  expect(id3v2TagToTagData(tagOf([popm(0)])).rating).toBe(0);
});

it("uses the first POPM frame when several are present", () => {
  const tag = tagOf([popm(255, "first"), popm(1, "second")]);
  expect(id3v2TagToTagData(tag).rating).toBe(1);
});

it("ignores a malformed POPM frame", () => {
  const broken: Id3v2Frame = { id: "POPM", flags: NO_FRAME_FLAGS, data: Uint8Array.from([0x61]) };
  expect(id3v2TagToTagData(tagOf([broken])).rating).toBeUndefined();
});
