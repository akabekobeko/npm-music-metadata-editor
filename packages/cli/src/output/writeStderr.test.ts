import { afterEach, expect, it, vi } from "vitest";
import { createLogger } from "./createLogger.js";
import { resetLogger, setLogger } from "./logger.js";
import { writeStderr } from "./writeStderr.js";

const sink = vi.fn<(chunk: string) => void>();

afterEach(() => {
  sink.mockClear();
  resetLogger();
});

it("dispatches each [mme] line as Logger.info (no double prefix)", () => {
  setLogger(createLogger({ quiet: false, verbose: false, noColor: true, sink }));
  writeStderr("[mme] wrote: a.mp3\n[mme] wrote: b.mp3\n");
  expect(sink).toHaveBeenNthCalledWith(1, "[mme] wrote: a.mp3\n");
  expect(sink).toHaveBeenNthCalledWith(2, "[mme] wrote: b.mp3\n");
});

it("dispatches [warn] lines through Logger.warn", () => {
  setLogger(createLogger({ quiet: false, verbose: false, noColor: true, sink }));
  writeStderr("[warn] suspicious frame\n");
  expect(sink).toHaveBeenCalledOnce();
  expect(sink.mock.calls[0]?.[0]).toBe("[warn] suspicious frame\n");
});

it("dispatches [debug] lines only when --verbose is set", () => {
  setLogger(createLogger({ quiet: false, verbose: false, noColor: true, sink }));
  writeStderr("[debug] format=mp3\n");
  expect(sink).not.toHaveBeenCalled();

  setLogger(createLogger({ quiet: false, verbose: true, noColor: true, sink }));
  writeStderr("[debug] format=mp3\n");
  expect(sink).toHaveBeenCalledOnce();
  expect(sink.mock.calls[0]?.[0]).toBe("[debug] format=mp3\n");
});

it("routes prefix-less lines through Logger.error so unexpected output stays visible", () => {
  setLogger(createLogger({ quiet: false, verbose: false, noColor: true, sink }));
  writeStderr("plain line\n");
  expect(sink).toHaveBeenCalledOnce();
  expect(sink.mock.calls[0]?.[0]).toBe("plain line\n");
});

it("--quiet drops [mme] / [warn] but [unknown] prefix still routes to error", () => {
  setLogger(createLogger({ quiet: true, verbose: false, noColor: true, sink }));
  writeStderr("[mme] info\n[warn] warn\nunknown\n");
  expect(sink).toHaveBeenCalledOnce();
  expect(sink.mock.calls[0]?.[0]).toBe("unknown\n");
});

it("does nothing for an empty payload", () => {
  setLogger(createLogger({ quiet: false, verbose: false, noColor: true, sink }));
  writeStderr("");
  expect(sink).not.toHaveBeenCalled();
});
