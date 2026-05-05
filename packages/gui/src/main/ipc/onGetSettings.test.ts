import { describe, expect, it } from "vitest";
import { onGetSettings } from "./onGetSettings.js";

const fakeEvent = {} as Electron.IpcMainInvokeEvent;

describe("onGetSettings", () => {
  it("returns NotImplemented in Phase 2", async () => {
    const response = await onGetSettings(fakeEvent);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.name).toBe("NotImplemented");
    }
  });
});
