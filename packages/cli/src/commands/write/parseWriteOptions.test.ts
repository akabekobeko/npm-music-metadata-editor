import { CommanderError } from "commander";
import { describe, expect, it } from "vitest";
import { parseWriteOptions } from "./parseWriteOptions.js";

describe("parseWriteOptions", () => {
  it("resolves a file source with in-place output by default", () => {
    const opts = parseWriteOptions({ file: "song.mp3", opts: {} });
    expect(opts.source).toEqual({ kind: "file", path: "song.mp3" });
    expect(opts.output).toEqual({ kind: "in-place" });
    expect(opts.atomic).toBe(true);
    expect(opts.dryRun).toBe(false);
  });

  it("--no-atomic flips atomic to false", () => {
    const opts = parseWriteOptions({ file: "song.mp3", opts: { atomic: false } });
    expect(opts.atomic).toBe(false);
  });

  it("--output <path> resolves to a path output", () => {
    const opts = parseWriteOptions({ file: "song.mp3", opts: { output: "out.mp3" } });
    expect(opts.output).toEqual({ kind: "path", path: "out.mp3" });
  });

  it("rejects --output - without --stdin", () => {
    expect(() => parseWriteOptions({ file: "song.mp3", opts: { output: "-" } })).toThrow(
      /--output -/,
    );
  });

  it("--stdin + --format + --output - resolves to stdin/stdout", () => {
    const opts = parseWriteOptions({
      file: undefined,
      opts: { stdin: true, format: "mp3", output: "-" },
    });
    expect(opts.source).toEqual({ kind: "stdin", format: "mp3" });
    expect(opts.output).toEqual({ kind: "stdout" });
  });

  it("rejects --stdin together with a file argument", () => {
    expect(() =>
      parseWriteOptions({ file: "song.mp3", opts: { stdin: true, format: "mp3", output: "-" } }),
    ).toThrow(CommanderError);
  });

  it("rejects --stdin without --format", () => {
    expect(() =>
      parseWriteOptions({ file: undefined, opts: { stdin: true, output: "-" } }),
    ).toThrow(/--format/);
  });

  it("rejects --stdin without --output", () => {
    expect(() =>
      parseWriteOptions({ file: undefined, opts: { stdin: true, format: "mp3" } }),
    ).toThrow(/--output/);
  });

  it("rejects --stdin + --clear (stream mode cannot clear)", () => {
    expect(() =>
      parseWriteOptions({
        file: undefined,
        opts: { stdin: true, format: "mp3", output: "-", clear: ["title"] },
      }),
    ).toThrow(/--clear/);
  });

  it("rejects --dry-run + --output -", () => {
    expect(() =>
      parseWriteOptions({
        file: undefined,
        opts: { stdin: true, format: "mp3", output: "-", dryRun: true },
      }),
    ).toThrow(/--dry-run/);
  });

  it("rejects --dry-run in stream mode regardless of output", () => {
    expect(() =>
      parseWriteOptions({
        file: undefined,
        opts: { stdin: true, format: "mp3", output: "out.mp3", dryRun: true },
      }),
    ).toThrow(/file mode/);
  });

  it("rejects --tag-file - together with --stdin", () => {
    expect(() =>
      parseWriteOptions({
        file: undefined,
        opts: { stdin: true, format: "mp3", output: "-", tagFile: "-" },
      }),
    ).toThrow(/--tag-file/);
  });

  it("requires either file or --stdin", () => {
    expect(() => parseWriteOptions({ file: undefined, opts: {} })).toThrow(/file.*--stdin/);
  });
});
