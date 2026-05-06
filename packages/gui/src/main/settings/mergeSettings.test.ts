import { expect, it } from "vitest";
import { defaultSettings } from "./defaults.js";
import { mergeSettings } from "./mergeSettings.js";
import type { AppSettings } from "./types.js";

const baseSettings: AppSettings = defaultSettings;

it("returns a fresh object even when the patch is empty", () => {
  const next = mergeSettings(baseSettings, {});
  expect(next).not.toBe(baseSettings);
  expect(next).toEqual(baseSettings);
});

it("ignores the version key on the patch", () => {
  const next = mergeSettings(baseSettings, {
    version: 999 as unknown as 1,
    window: { width: 1024 },
  });
  expect(next.version).toBe(1);
  expect(next.window.width).toBe(1024);
});

it("replaces visibleIds wholesale", () => {
  const next = mergeSettings(baseSettings, {
    columns: { visibleIds: ["fileName", "tag.title"] },
  });
  expect(next.columns.visibleIds).toEqual(["fileName", "tag.title"]);
});

it("shallow-merges column widths", () => {
  const seeded: AppSettings = {
    ...baseSettings,
    columns: { ...baseSettings.columns, widths: { fileName: 200 } },
  };
  const next = mergeSettings(seeded, {
    columns: { widths: { "tag.title": 300 } },
  });
  expect(next.columns.widths).toEqual({ fileName: 200, "tag.title": 300 });
});

it("drops non-positive or non-finite column widths", () => {
  const next = mergeSettings(baseSettings, {
    columns: {
      widths: { ok: 120, zero: 0, negative: -5, infinite: Number.POSITIVE_INFINITY },
    },
  });
  expect(next.columns.widths).toEqual({ ok: 120 });
});

it("merges window scalars while keeping unmodified keys", () => {
  const next = mergeSettings(baseSettings, { window: { maximized: true } });
  expect(next.window).toEqual({
    width: baseSettings.window.width,
    height: baseSettings.window.height,
    maximized: true,
  });
});

it("replaces recentFiles wholesale and caps to 10 entries", () => {
  const longList = Array.from({ length: 15 }, (_, index) => `/path/${index}.mp3`);
  const next = mergeSettings(baseSettings, { recentFiles: longList });
  expect(next.recentFiles).toHaveLength(10);
  expect(next.recentFiles[0]).toBe("/path/0.mp3");
  expect(next.recentFiles[9]).toBe("/path/9.mp3");
});

it("keeps recentFiles when the patch omits it", () => {
  const seeded: AppSettings = { ...baseSettings, recentFiles: ["/a.mp3"] };
  const next = mergeSettings(seeded, { window: { width: 1000 } });
  expect(next.recentFiles).toEqual(["/a.mp3"]);
});

it("forwards locale only when explicitly set", () => {
  const next = mergeSettings(baseSettings, { locale: "ja" });
  expect(next.locale).toBe("ja");

  const cleared = mergeSettings(next, {});
  expect(cleared.locale).toBe("ja");
});
