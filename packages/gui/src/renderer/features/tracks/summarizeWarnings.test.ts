import { expect, it } from "vitest";
import type { Warning } from "../../../main/ipc/types.js";
import { summarizeWarnings } from "./summarizeWarnings";

it("returns a zero-count summary for an empty list", () => {
  const summary = summarizeWarnings([]);
  expect(summary).toEqual({ count: 0, maxSeverity: undefined, label: undefined, messages: [] });
});

it("captures the highest severity from a mixed list (error > warn > info)", () => {
  const warnings: readonly Warning[] = [
    { severity: "info", message: "info message" },
    { severity: "warn", message: "warn message" },
    { severity: "error", message: "error message" },
  ];
  const summary = summarizeWarnings(warnings);
  expect(summary.maxSeverity).toBe("error");
  expect(summary.count).toBe(3);
  expect(summary.label).toBe("3");
  expect(summary.messages).toEqual(["info message", "warn message", "error message"]);
});

it("reports `warn` as max when no error is present", () => {
  const warnings: readonly Warning[] = [
    { severity: "info", message: "x" },
    { severity: "warn", message: "y" },
  ];
  expect(summarizeWarnings(warnings).maxSeverity).toBe("warn");
});

it("reports `info` as max when only info entries are present", () => {
  expect(summarizeWarnings([{ severity: "info", message: "x" }]).maxSeverity).toBe("info");
});
