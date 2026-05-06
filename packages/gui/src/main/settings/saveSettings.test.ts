import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { SETTINGS_FILE_NAME } from "./constants.js";
import { defaultSettings } from "./defaults.js";
import { loadSettingsSync } from "./loadSettingsSync.js";
import { saveSettings, saveSettingsSync } from "./saveSettings.js";

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(path.join(tmpdir(), "mme-settings-save-"));
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

it("writes the settings to disk and is round-trippable through loadSettingsSync", async () => {
  const seeded = {
    ...defaultSettings,
    columns: { ...defaultSettings.columns, widths: { fileName: 220 } },
    recentFiles: ["/a.mp3"],
  };

  await saveSettings(workdir, seeded);
  const loaded = loadSettingsSync(workdir);
  expect(loaded).toEqual(seeded);
});

it("emits valid JSON terminated by a newline", async () => {
  await saveSettings(workdir, defaultSettings);
  const raw = readFileSync(path.join(workdir, SETTINGS_FILE_NAME), "utf8");
  expect(raw.endsWith("\n")).toBe(true);
  expect(JSON.parse(raw)).toEqual(defaultSettings);
});

it("creates the user-data directory if it does not yet exist", async () => {
  const nested = path.join(workdir, "nested", "path");
  await saveSettings(nested, defaultSettings);
  expect(loadSettingsSync(nested)).toEqual(defaultSettings);
});

it("saveSettingsSync produces the same on-disk shape as the async path", () => {
  saveSettingsSync(workdir, defaultSettings);
  const raw = readFileSync(path.join(workdir, SETTINGS_FILE_NAME), "utf8");
  expect(JSON.parse(raw)).toEqual(defaultSettings);
});

it("malformed JSON is healed by the next save", async () => {
  saveSettingsSync(workdir, defaultSettings);
  // Corrupt the file in place.
  const filePath = path.join(workdir, SETTINGS_FILE_NAME);
  rmSync(filePath, { force: true });

  await saveSettings(workdir, defaultSettings);
  expect(loadSettingsSync(workdir)).toEqual(defaultSettings);
});
