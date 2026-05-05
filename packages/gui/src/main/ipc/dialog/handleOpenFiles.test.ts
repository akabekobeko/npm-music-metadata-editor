import { describe, expect, it, vi } from "vitest";
import { createOpenFilesHandler } from "./handleOpenFiles.js";

describe("createOpenFilesHandler", () => {
  it("returns the selected file paths", async () => {
    const showOpenDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePaths: ["/x/a.mp3", "/x/b.mp3"],
    });
    const handler = createOpenFilesHandler({
      showOpenDialog: showOpenDialog as never,
      getFocusedWindow: () => null,
    });

    const result = await handler({});

    expect(result).toEqual({ ok: true, value: ["/x/a.mp3", "/x/b.mp3"] });
  });

  it("returns an empty list when the dialog is cancelled", async () => {
    const showOpenDialog = vi.fn().mockResolvedValue({
      canceled: true,
      filePaths: [],
    });
    const handler = createOpenFilesHandler({
      showOpenDialog: showOpenDialog as never,
      getFocusedWindow: () => null,
    });

    const result = await handler({});

    expect(result).toEqual({ ok: true, value: [] });
  });

  it("includes multiSelections when multiple is true (the default)", async () => {
    const showOpenDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePaths: [],
    });
    const handler = createOpenFilesHandler({
      showOpenDialog: showOpenDialog as never,
      getFocusedWindow: () => null,
    });

    await handler({});

    const opts = showOpenDialog.mock.calls[0]?.[0] as { properties?: readonly string[] };
    expect(opts.properties).toContain("multiSelections");
  });

  it("omits multiSelections when multiple is false", async () => {
    const showOpenDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePaths: [],
    });
    const handler = createOpenFilesHandler({
      showOpenDialog: showOpenDialog as never,
      getFocusedWindow: () => null,
    });

    await handler({ multiple: false });

    const opts = showOpenDialog.mock.calls[0]?.[0] as { properties?: readonly string[] };
    expect(opts.properties).not.toContain("multiSelections");
  });

  it("returns an IpcError when the dialog backend rejects", async () => {
    const showOpenDialog = vi.fn().mockRejectedValue(new Error("dialog failed"));
    const handler = createOpenFilesHandler({
      showOpenDialog: showOpenDialog as never,
      getFocusedWindow: () => null,
    });

    const result = await handler({});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("dialog failed");
    }
  });
});
