import { afterEach, expect, it, vi } from "vitest";
import { printWarning } from "./printWarning.js";

const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

afterEach(() => {
  writeSpy.mockClear();
});

it("writes [warn] <message> with a trailing newline to stderr", () => {
  printWarning({ severity: "warn", message: "could not parse frame" });
  expect(writeSpy).toHaveBeenCalledOnce();
  expect(writeSpy.mock.calls[0]?.[0]).toBe("[warn] could not parse frame\n");
});

it("ignores severity and code in Phase 1 output (no formatting yet)", () => {
  printWarning({ severity: "error", message: "fatal-ish", code: "id3v2-bad-frame" });
  expect(writeSpy.mock.calls[0]?.[0]).toBe("[warn] fatal-ish\n");
});
