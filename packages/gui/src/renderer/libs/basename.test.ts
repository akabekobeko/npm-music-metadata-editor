import { expect, it } from "vitest";
import { basename } from "./basename";

it("returns the last segment of a POSIX path", () => {
  expect(basename("/Users/me/Music/song.mp3")).toBe("song.mp3");
});

it("returns the last segment of a Windows path", () => {
  expect(basename("C:\\Users\\me\\Music\\song.mp3")).toBe("song.mp3");
});

it("handles mixed separators by taking the rightmost one", () => {
  expect(basename("/a\\b/c.mp3")).toBe("c.mp3");
});

it("returns the input unchanged when no separator is present", () => {
  expect(basename("song.mp3")).toBe("song.mp3");
});

it("returns an empty string when the path ends with a separator", () => {
  expect(basename("/a/b/")).toBe("");
});

it("handles empty input", () => {
  expect(basename("")).toBe("");
});
