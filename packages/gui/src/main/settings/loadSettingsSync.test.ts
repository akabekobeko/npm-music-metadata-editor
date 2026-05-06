import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { SETTINGS_FILE_NAME } from "./constants.js";
import { defaultSettings } from "./defaults.js";
import { loadSettingsSync } from "./loadSettingsSync.js";

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(path.join(tmpdir(), "mme-settings-load-"));
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

it("returns defaults when the file does not exist", () => {
  expect(loadSettingsSync(workdir)).toEqual(defaultSettings);
});

it("returns defaults when the file is malformed JSON", () => {
  writeFileSync(path.join(workdir, SETTINGS_FILE_NAME), "{not json", "utf8");
  expect(loadSettingsSync(workdir)).toEqual(defaultSettings);
});

it("returns defaults when the file's top-level value is not an object", () => {
  writeFileSync(path.join(workdir, SETTINGS_FILE_NAME), "[]", "utf8");
  expect(loadSettingsSync(workdir)).toEqual(defaultSettings);
});

it("merges a stored partial onto defaults", () => {
  const saved = {
    version: 1,
    columns: { visibleIds: ["fileName", "tag.title"] },
    recentFiles: ["/a.mp3", "/b.mp3"],
  };
  writeFileSync(path.join(workdir, SETTINGS_FILE_NAME), JSON.stringify(saved, null, 2), "utf8");

  const loaded = loadSettingsSync(workdir);
  expect(loaded.version).toBe(1);
  expect(loaded.columns.visibleIds).toEqual(["fileName", "tag.title"]);
  expect(loaded.columns.widths).toEqual({});
  expect(loaded.window).toEqual(defaultSettings.window);
  expect(loaded.recentFiles).toEqual(["/a.mp3", "/b.mp3"]);
});

it("ignores unknown top-level keys", () => {
  const saved = { version: 1, columns: defaultSettings.columns, futureKey: { anything: "goes" } };
  writeFileSync(path.join(workdir, SETTINGS_FILE_NAME), JSON.stringify(saved, null, 2), "utf8");

  const loaded = loadSettingsSync(workdir);
  expect(loaded).not.toHaveProperty("futureKey");
});
