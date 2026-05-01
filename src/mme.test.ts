import { expect, it } from "vitest";
import * as mme from "./mme.js";

it("re-exports the high-level API", () => {
  expect(typeof mme.loadTrack).toBe("function");
  expect(typeof mme.saveTrack).toBe("function");
  expect(typeof mme.readMetadata).toBe("function");
  expect(typeof mme.writeMetadata).toBe("function");
  expect(typeof mme.createMmeError).toBe("function");
  expect(typeof mme.isMmeError).toBe("function");
});

it("re-exports PictureKind constants", () => {
  expect(mme.PictureKind.CoverFront).toBe(3);
  expect(mme.PictureKind.Other).toBe(0);
});
