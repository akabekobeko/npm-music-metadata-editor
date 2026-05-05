import { describe, expect, it } from "vitest";
import { handleSettingsGet, handleSettingsSet } from "./handleSettings.js";

describe("handleSettingsGet", () => {
  it("returns NotImplemented in Phase 2", async () => {
    const response = await handleSettingsGet();
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.name).toBe("NotImplemented");
    }
  });
});

describe("handleSettingsSet", () => {
  it("returns NotImplemented in Phase 2", async () => {
    const response = await handleSettingsSet();
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.name).toBe("NotImplemented");
    }
  });
});
