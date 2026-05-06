import { expect, it } from "vitest";
import { touchRecentFile } from "./touchRecentFile.js";

it("prepends a brand new path", () => {
  expect(touchRecentFile(["/a.mp3"], ["/b.mp3"])).toEqual(["/b.mp3", "/a.mp3"]);
});

it("hoists an existing path back to the top without duplicating it", () => {
  expect(touchRecentFile(["/a.mp3", "/b.mp3", "/c.mp3"], ["/c.mp3"])).toEqual([
    "/c.mp3",
    "/a.mp3",
    "/b.mp3",
  ]);
});

it("de-dupes within the input batch (first wins)", () => {
  expect(touchRecentFile([], ["/a.mp3", "/b.mp3", "/a.mp3"])).toEqual(["/a.mp3", "/b.mp3"]);
});

it("caps the result at RECENT_FILES_LIMIT (10)", () => {
  const seeded = Array.from({ length: 10 }, (_, i) => `/old-${i}.mp3`);
  const result = touchRecentFile(seeded, ["/new.mp3"]);
  expect(result).toHaveLength(10);
  expect(result[0]).toBe("/new.mp3");
  expect(result.includes("/old-9.mp3")).toBe(false);
});
