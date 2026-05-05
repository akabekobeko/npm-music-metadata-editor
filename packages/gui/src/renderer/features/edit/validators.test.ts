import { expect, it } from "vitest";
import { validateTagValue } from "./validators";

it("treats empty free-text input as a tag clear", () => {
  expect(validateTagValue("title", "")).toEqual({ ok: true, value: undefined });
});

it("preserves whitespace in free-text input (lyrics-leaning fields)", () => {
  expect(validateTagValue("title", "  Hello  ")).toEqual({ ok: true, value: "  Hello  " });
});

it("accepts a 4-digit year inside [1, 9999]", () => {
  expect(validateTagValue("year", "1999")).toEqual({ ok: true, value: 1999 });
});

it("clears the year tag for empty input", () => {
  expect(validateTagValue("year", "")).toEqual({ ok: true, value: undefined });
});

it("rejects a year of 0", () => {
  const result = validateTagValue("year", "0");
  expect(result.ok).toBe(false);
});

it("rejects a year above 9999", () => {
  const result = validateTagValue("year", "10000");
  expect(result.ok).toBe(false);
});

it("rejects a non-integer year", () => {
  const result = validateTagValue("year", "1999.5");
  expect(result.ok).toBe(false);
});

it("accepts a track number inside [1, 99999]", () => {
  expect(validateTagValue("trackNumber", "12")).toEqual({ ok: true, value: 12 });
});

it("collapses 0 to undefined for track number", () => {
  expect(validateTagValue("trackNumber", "0")).toEqual({ ok: true, value: undefined });
});

it("clears track number for empty input", () => {
  expect(validateTagValue("trackNumber", "")).toEqual({ ok: true, value: undefined });
});

it("rejects a track number above 99999", () => {
  const result = validateTagValue("trackNumber", "100000");
  expect(result.ok).toBe(false);
});

it("applies the same integer rule to disc / track / disc total", () => {
  for (const field of ["trackTotal", "discNumber", "discTotal"] as const) {
    expect(validateTagValue(field, "5")).toEqual({ ok: true, value: 5 });
    expect(validateTagValue(field, "0")).toEqual({ ok: true, value: undefined });
  }
});

it("accepts a BPM inside [1, 999]", () => {
  expect(validateTagValue("bpm", "120")).toEqual({ ok: true, value: 120 });
});

it("rejects a BPM above 999", () => {
  const result = validateTagValue("bpm", "1000");
  expect(result.ok).toBe(false);
});

it("collapses BPM 0 to undefined", () => {
  expect(validateTagValue("bpm", "0")).toEqual({ ok: true, value: undefined });
});

it("normalizes rating to [0, 1] using value / 5", () => {
  expect(validateTagValue("rating", "5")).toEqual({ ok: true, value: 1 });
  expect(validateTagValue("rating", "2.5")).toEqual({ ok: true, value: 0.5 });
  expect(validateTagValue("rating", "0")).toEqual({ ok: true, value: 0 });
});

it("rejects rating outside [0, 5]", () => {
  expect(validateTagValue("rating", "6").ok).toBe(false);
  expect(validateTagValue("rating", "-1").ok).toBe(false);
});

it("rejects rating that is not a half integer", () => {
  expect(validateTagValue("rating", "1.25").ok).toBe(false);
});

it("clears rating for empty input", () => {
  expect(validateTagValue("rating", "")).toEqual({ ok: true, value: undefined });
});

it("accepts every supported date precision", () => {
  for (const field of ["recordingDate", "originalReleaseDate", "publishingDate"] as const) {
    expect(validateTagValue(field, "2024")).toEqual({ ok: true, value: "2024" });
    expect(validateTagValue(field, "2024-03")).toEqual({ ok: true, value: "2024-03" });
    expect(validateTagValue(field, "2024-03-15")).toEqual({ ok: true, value: "2024-03-15" });
    expect(validateTagValue(field, "2024-03-15T18:30:45")).toEqual({
      ok: true,
      value: "2024-03-15T18:30:45",
    });
  }
});

it("rejects a malformed date", () => {
  expect(validateTagValue("recordingDate", "March 15").ok).toBe(false);
  expect(validateTagValue("recordingDate", "2024/03/15").ok).toBe(false);
});

it("clears date for empty input", () => {
  expect(validateTagValue("recordingDate", "")).toEqual({ ok: true, value: undefined });
});

it("accepts a 2- or 3-letter ISO-639 language code", () => {
  expect(validateTagValue("language", "eng")).toEqual({ ok: true, value: "eng" });
  expect(validateTagValue("language", "ja")).toEqual({ ok: true, value: "ja" });
});

it("rejects a language code with the wrong shape", () => {
  expect(validateTagValue("language", "ENG").ok).toBe(false);
  expect(validateTagValue("language", "english").ok).toBe(false);
});

it("clears language for empty input", () => {
  expect(validateTagValue("language", "")).toEqual({ ok: true, value: undefined });
});
