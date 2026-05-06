import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { defaultSettings } from "./defaults.js";
import { loadSettingsSync } from "./loadSettingsSync.js";
import {
  applySettingsPatch,
  flushSettings,
  getSettings,
  initializeSettings,
  releaseSettings,
} from "./settings.js";

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(path.join(tmpdir(), "mme-settings-store-"));
});

afterEach(() => {
  releaseSettings();
  rmSync(workdir, { recursive: true, force: true });
});

it("initialise returns defaults when the file does not exist", () => {
  const seeded = initializeSettings(workdir);
  expect(seeded).toEqual(defaultSettings);
  expect(getSettings()).toEqual(defaultSettings);
});

it("applySettingsPatch deep-merges and returns the new snapshot synchronously", () => {
  initializeSettings(workdir);
  const next = applySettingsPatch({ window: { width: 1024 } });
  expect(next.window.width).toBe(1024);
  expect(getSettings().window.width).toBe(1024);
});

it("flushSettings writes the latest snapshot synchronously to disk", async () => {
  initializeSettings(workdir);
  applySettingsPatch({ recentFiles: ["/a.mp3", "/b.mp3"] });
  await flushSettings();

  const fromDisk = loadSettingsSync(workdir);
  expect(fromDisk.recentFiles).toEqual(["/a.mp3", "/b.mp3"]);
});

it("releaseSettings flushes the pending debounce", () => {
  initializeSettings(workdir);
  applySettingsPatch({ window: { maximized: true } });
  releaseSettings();

  const fromDisk = loadSettingsSync(workdir);
  expect(fromDisk.window.maximized).toBe(true);
});

it("re-initialise resets the in-memory cache from disk", () => {
  initializeSettings(workdir);
  applySettingsPatch({ window: { width: 999 } });
  releaseSettings();

  const reloaded = initializeSettings(workdir);
  expect(reloaded.window.width).toBe(999);
});
