import { describe, expect, it } from "vitest";
import { onListFormatSupport } from "./onListFormatSupport.js";

const fakeEvent = {} as Electron.IpcMainInvokeEvent;

describe("onListFormatSupport", () => {
  it("returns the format-support matrix", async () => {
    const response = await onListFormatSupport(fakeEvent);
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.value.length).toBeGreaterThan(0);
      expect(response.value[0]?.format).toBe("mp3");
    }
  });
});
