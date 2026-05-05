import { expect, it } from "vitest";
import { formatTimeInput, parseTimeInput } from "./parseTimeInput.js";

it("parses mm:ss.SSS", () => {
  expect(parseTimeInput("01:23.500")).toBe(83_500);
});

it("parses mm:ss without fractions", () => {
  expect(parseTimeInput("01:23")).toBe(83_000);
});

it("parses bare seconds", () => {
  expect(parseTimeInput("12.250")).toBe(12_250);
});

it("rejects out-of-range seconds", () => {
  expect(parseTimeInput("00:75.000")).toBeNull();
});

it("rejects unparseable strings", () => {
  expect(parseTimeInput("foo")).toBeNull();
  expect(parseTimeInput("")).toBeNull();
});

it("formatTimeInput round-trips parseTimeInput", () => {
  const ms = 12_345_678;
  expect(parseTimeInput(formatTimeInput(ms))).toBe(ms);
});

it("formatTimeInput pads each component", () => {
  expect(formatTimeInput(0)).toBe("00:00.000");
  expect(formatTimeInput(5)).toBe("00:00.005");
});
