import { describe, expect, it, vi } from "vitest";
import { createLogger } from "./createLogger.js";

const ESC = "\x1b";

describe("createLogger — quiet / verbose gating", () => {
  it("info / warn flow when neither --quiet nor --verbose is set", () => {
    const sink = vi.fn<(chunk: string) => void>();
    const logger = createLogger({ quiet: false, verbose: false, noColor: true, sink });
    logger.info("status");
    logger.warn("careful");
    logger.error("boom");
    expect(sink).toHaveBeenNthCalledWith(1, "[mme] status\n");
    expect(sink).toHaveBeenNthCalledWith(2, "[warn] careful\n");
    expect(sink).toHaveBeenNthCalledWith(3, "boom\n");
  });

  it("--quiet suppresses info and warn but keeps error", () => {
    const sink = vi.fn<(chunk: string) => void>();
    const logger = createLogger({ quiet: true, verbose: false, noColor: true, sink });
    logger.info("status");
    logger.warn("careful");
    logger.error("boom");
    expect(sink).toHaveBeenCalledOnce();
    expect(sink.mock.calls[0]?.[0]).toBe("boom\n");
  });

  it("--verbose surfaces debug while leaving info / warn / error untouched", () => {
    const sink = vi.fn<(chunk: string) => void>();
    const logger = createLogger({ quiet: false, verbose: true, noColor: true, sink });
    logger.debug("trace");
    logger.info("status");
    expect(sink).toHaveBeenNthCalledWith(1, "[debug] trace\n");
    expect(sink).toHaveBeenNthCalledWith(2, "[mme] status\n");
  });

  it("debug is silent without --verbose", () => {
    const sink = vi.fn<(chunk: string) => void>();
    const logger = createLogger({ quiet: false, verbose: false, noColor: true, sink });
    logger.debug("trace");
    expect(sink).not.toHaveBeenCalled();
  });
});

describe("createLogger — color gating", () => {
  it("never emits ANSI escapes when --no-color is set", () => {
    const sink = vi.fn<(chunk: string) => void>();
    const logger = createLogger({
      quiet: false,
      verbose: true,
      noColor: true,
      sink,
      isTty: true,
      env: {},
    });
    logger.info("a");
    logger.warn("b");
    logger.error("c");
    logger.debug("d");
    sink.mock.calls.forEach((call) => {
      expect(call[0]).not.toContain(ESC);
    });
  });

  it("never emits ANSI escapes when NO_COLOR is set in env", () => {
    const sink = vi.fn<(chunk: string) => void>();
    const logger = createLogger({
      quiet: false,
      verbose: false,
      noColor: false,
      sink,
      isTty: true,
      env: { NO_COLOR: "1" },
    });
    logger.error("c");
    expect(sink.mock.calls[0]?.[0]).not.toContain(ESC);
  });

  it("emits ANSI escapes when FORCE_COLOR is set even on a non-TTY", () => {
    const sink = vi.fn<(chunk: string) => void>();
    const logger = createLogger({
      quiet: false,
      verbose: false,
      noColor: false,
      sink,
      isTty: false,
      env: { FORCE_COLOR: "1" },
    });
    logger.error("boom");
    expect(sink.mock.calls[0]?.[0]).toContain(ESC);
  });

  it("emits ANSI escapes on a TTY without opt-outs", () => {
    const sink = vi.fn<(chunk: string) => void>();
    const logger = createLogger({
      quiet: false,
      verbose: false,
      noColor: false,
      sink,
      isTty: true,
      env: {},
    });
    logger.error("boom");
    expect(sink.mock.calls[0]?.[0]).toContain(ESC);
  });
});
