import { describe, expect, it } from "vitest";
import { handleSaveTrack } from "./handleSaveTrack.js";

describe("handleSaveTrack", () => {
  it("returns NotImplemented in Phase 2", async () => {
    const response = await handleSaveTrack({
      filePath: "/tmp/anything.mp3",
      tag: { title: "x" },
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.name).toBe("NotImplemented");
    }
  });
});
