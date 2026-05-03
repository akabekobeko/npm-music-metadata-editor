import { CommanderError } from "commander";
import { describe, expect, it } from "vitest";
import { parseReadOptions } from "./parseReadOptions.js";

describe("parseReadOptions", () => {
  it("resolves a file source to JSON output mode by default", () => {
    const opts = parseReadOptions({ file: "song.mp3", opts: { warnings: true } });
    expect(opts.source).toEqual({ kind: "file", path: "song.mp3" });
    expect(opts.outputMode).toBe("json");
    expect(opts.noWarnings).toBe(false);
  });

  it("resolves --stdin + --format to a stdin source", () => {
    const opts = parseReadOptions({
      file: undefined,
      opts: { stdin: true, format: "mp3", warnings: true },
    });
    expect(opts.source).toEqual({ kind: "stdin", format: "mp3" });
  });

  it("rejects --stdin + file argument as Usage failure", () => {
    expect(() =>
      parseReadOptions({ file: "song.mp3", opts: { stdin: true, format: "mp3" } }),
    ).toThrow(CommanderError);
  });

  it("rejects --stdin without --format", () => {
    expect(() => parseReadOptions({ file: undefined, opts: { stdin: true } })).toThrow(
      /requires `--format/,
    );
  });

  it("rejects --pretty + --field as Usage failure", () => {
    expect(() =>
      parseReadOptions({ file: "song.mp3", opts: { pretty: true, field: "title" } }),
    ).toThrow(/mutually exclusive/);
  });

  it("rejects --include + --exclude as Usage failure", () => {
    expect(() =>
      parseReadOptions({ file: "song.mp3", opts: { include: "tag", exclude: "warnings" } }),
    ).toThrow(/mutually exclusive/);
  });

  it("parses comma-separated --include into TrackSection[]", () => {
    const opts = parseReadOptions({
      file: "song.mp3",
      opts: { include: "audioFormat, tag, warnings", warnings: true },
    });
    expect(opts.include).toEqual(["audioFormat", "tag", "warnings"]);
    expect(opts.exclude).toBeUndefined();
  });

  it("rejects unknown sections in --include", () => {
    expect(() => parseReadOptions({ file: "song.mp3", opts: { include: "tag,bogus" } })).toThrow(
      /unknown section "bogus"/,
    );
  });

  it("rejects unknown audio formats", () => {
    expect(() =>
      parseReadOptions({ file: undefined, opts: { stdin: true, format: "ogm" } }),
    ).toThrow(/unknown audio format "ogm"/);
  });

  it("treats `warnings: false` as noWarnings", () => {
    const opts = parseReadOptions({ file: "song.mp3", opts: { warnings: false } });
    expect(opts.noWarnings).toBe(true);
  });

  it("requires either file or --stdin", () => {
    expect(() => parseReadOptions({ file: undefined, opts: {} })).toThrow(/file.*--stdin/);
  });

  it("--field switches to field output mode and stores the path", () => {
    const opts = parseReadOptions({ file: "song.mp3", opts: { field: "tag.title" } });
    expect(opts.outputMode).toBe("field");
    expect(opts.field).toBe("tag.title");
  });
});
