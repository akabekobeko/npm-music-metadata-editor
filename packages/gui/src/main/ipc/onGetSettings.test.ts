import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { defaultSettings } from "../settings/defaults.js";
import { initializeSettings, releaseSettings } from "../settings/settings.js";
import { onGetSettings } from "./onGetSettings.js";

const fakeEvent = {} as Electron.IpcMainInvokeEvent;

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(path.join(tmpdir(), "mme-settings-get-"));
  initializeSettings(workdir);
});

afterEach(() => {
  releaseSettings();
  rmSync(workdir, { recursive: true, force: true });
});

it("returns the cached settings snapshot on success", async () => {
  const response = await onGetSettings(fakeEvent);
  expect(response.ok).toBe(true);
  if (response.ok) {
    expect(response.value).toEqual(defaultSettings);
  }
});

it("returns defaults even when the store is uninitialised", async () => {
  releaseSettings();
  const response = await onGetSettings(fakeEvent);
  expect(response.ok).toBe(true);
  if (response.ok) {
    expect(response.value).toEqual(defaultSettings);
  }
});
