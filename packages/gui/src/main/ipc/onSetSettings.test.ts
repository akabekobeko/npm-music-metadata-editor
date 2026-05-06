import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { initializeSettings, releaseSettings } from "../settings/settings.js";
import { onSetSettings } from "./onSetSettings.js";

const fakeEvent = {} as Electron.IpcMainInvokeEvent;

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(path.join(tmpdir(), "mme-settings-set-"));
  initializeSettings(workdir);
});

afterEach(() => {
  releaseSettings();
  rmSync(workdir, { recursive: true, force: true });
});

it("applies a window-size patch and returns the merged snapshot", async () => {
  const response = await onSetSettings(fakeEvent, {
    patch: { window: { width: 1024 } },
  });
  expect(response.ok).toBe(true);
  if (response.ok) {
    expect(response.value.window.width).toBe(1024);
  }
});

it("ignores the version key on the patch", async () => {
  const response = await onSetSettings(fakeEvent, {
    patch: { version: 999 as unknown as 1 },
  });
  expect(response.ok).toBe(true);
  if (response.ok) {
    expect(response.value.version).toBe(1);
  }
});

it("subsequent calls cumulate (deep-merge)", async () => {
  await onSetSettings(fakeEvent, {
    patch: { columns: { widths: { fileName: 200 } } },
  });
  const response = await onSetSettings(fakeEvent, {
    patch: { columns: { widths: { "tag.title": 300 } } },
  });
  expect(response.ok).toBe(true);
  if (response.ok) {
    expect(response.value.columns.widths).toEqual({ fileName: 200, "tag.title": 300 });
  }
});
