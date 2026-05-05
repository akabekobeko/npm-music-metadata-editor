import { describe, expect, it } from "vitest";
import { onSetSettings } from "./onSetSettings.js";

const fakeEvent = {} as Electron.IpcMainInvokeEvent;

describe("onSetSettings", () => {
  it("returns NotImplemented in Phase 2", async () => {
    const response = await onSetSettings(fakeEvent, { patch: { theme: "dark" } });
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.name).toBe("NotImplemented");
    }
  });
});
