import { afterEach, expect, it, vi } from "vitest";
import { createLogger } from "./createLogger.js";
import { resetLogger, setLogger } from "./logger.js";
import { printWarning } from "./printWarning.js";

const sink = vi.fn<(chunk: string) => void>();

afterEach(() => {
  sink.mockClear();
  resetLogger();
});

it("forwards the message through Logger.warn (default formatting + newline)", () => {
  setLogger(createLogger({ quiet: false, verbose: false, noColor: true, sink }));
  printWarning({ severity: "warn", message: "could not parse frame" });
  expect(sink).toHaveBeenCalledOnce();
  expect(sink.mock.calls[0]?.[0]).toBe("[warn] could not parse frame\n");
});

it("ignores severity and code (the logger applies its own [warn] prefix)", () => {
  setLogger(createLogger({ quiet: false, verbose: false, noColor: true, sink }));
  printWarning({ severity: "error", message: "fatal-ish", code: "id3v2-bad-frame" });
  expect(sink.mock.calls[0]?.[0]).toBe("[warn] fatal-ish\n");
});

it("is suppressed under --quiet", () => {
  setLogger(createLogger({ quiet: true, verbose: false, noColor: true, sink }));
  printWarning({ severity: "warn", message: "noisy" });
  expect(sink).not.toHaveBeenCalled();
});
