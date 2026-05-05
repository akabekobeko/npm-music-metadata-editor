import { expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

it("returns an empty string for undefined", () => {
  expect(formatDuration(undefined)).toBe("");
});

it("formats zero milliseconds as 0:00", () => {
  expect(formatDuration(0)).toBe("0:00");
});

it("truncates sub-second precision (1500 ms -> 0:01)", () => {
  expect(formatDuration(1500)).toBe("0:01");
});

it("formats minute-level durations as m:ss", () => {
  expect(formatDuration(63000)).toBe("1:03");
});

it("inserts hours past one hour (3661000 ms -> 1:01:01)", () => {
  expect(formatDuration(3661000)).toBe("1:01:01");
});

it("zero-pads minutes when hours are present (3600000 ms -> 1:00:00)", () => {
  expect(formatDuration(3600000)).toBe("1:00:00");
});
