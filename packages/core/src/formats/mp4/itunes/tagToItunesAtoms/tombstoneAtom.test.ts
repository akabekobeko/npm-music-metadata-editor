import { expect, it } from "vitest";
import { tombstoneAtom } from "./tombstoneAtom.js";

it("builds an atom with no values", () => {
  expect(tombstoneAtom({ name: "tmpo" })).toEqual({ name: "tmpo", values: [] });
});

it("carries the freeform meanName when given", () => {
  expect(tombstoneAtom({ name: "----", meanName: "LYRICIST" })).toEqual({
    name: "----",
    meanName: "LYRICIST",
    values: [],
  });
});
