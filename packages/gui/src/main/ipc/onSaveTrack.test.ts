import { describe, expect, it } from "vitest";
import { onSaveTrack } from "./onSaveTrack.js";

const fakeEvent = {} as Electron.IpcMainInvokeEvent;

describe("onSaveTrack", () => {
  it("returns NotImplemented in Phase 2", async () => {
    const response = await onSaveTrack(fakeEvent, {
      filePath: "/tmp/anything.mp3",
      tag: { title: "x" },
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.name).toBe("NotImplemented");
    }
  });
});
