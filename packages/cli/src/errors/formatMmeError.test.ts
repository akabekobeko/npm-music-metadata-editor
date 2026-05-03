import { createMmeError } from "@akabeko/music-metadata-editor";
import { CommanderError } from "commander";
import { expect, it } from "vitest";
import { ExitCode } from "./exitCodes.js";
import { formatMmeError } from "./formatMmeError.js";

it("maps unsupported-format MmeError to UnsupportedFormat exit code", () => {
  const error = createMmeError({ code: "unsupported-format", message: "no format detected" });
  const result = formatMmeError(error);
  expect(result.exitCode).toBe(ExitCode.UnsupportedFormat);
  expect(result.message).toBe("[mme:unsupported-format] no format detected");
});

it("maps invalid-tag MmeError to InvalidTag exit code", () => {
  const error = createMmeError({ code: "invalid-tag", message: "bad tag" });
  const result = formatMmeError(error);
  expect(result.exitCode).toBe(ExitCode.InvalidTag);
  expect(result.message).toBe("[mme:invalid-tag] bad tag");
});

it("falls back to Failure for unmapped MmeError codes", () => {
  const error = createMmeError({ code: "truncated-input", message: "ran out of bytes" });
  const result = formatMmeError(error);
  expect(result.exitCode).toBe(ExitCode.Failure);
  expect(result.message).toBe("[mme:truncated-input] ran out of bytes");
});

it("returns empty message + Success for commander help / version exits", () => {
  const help = new CommanderError(0, "commander.helpDisplayed", "(help)");
  const version = new CommanderError(0, "commander.version", "1.0.0");
  expect(formatMmeError(help)).toEqual({ message: "", exitCode: ExitCode.Success });
  expect(formatMmeError(version)).toEqual({ message: "", exitCode: ExitCode.Success });
});

it("maps other CommanderError instances to Usage exit code", () => {
  const error = new CommanderError(1, "commander.unknownCommand", "unknown command 'foo'");
  const result = formatMmeError(error);
  expect(result.exitCode).toBe(ExitCode.Usage);
  expect(result.message).toBe("[mme] unknown command 'foo'");
});

it("maps Node.js fs ENOENT errors to IoError exit code", () => {
  const error = Object.assign(new Error("ENOENT: no such file"), { code: "ENOENT" });
  const result = formatMmeError(error);
  expect(result.exitCode).toBe(ExitCode.IoError);
  expect(result.message).toBe("[mme] ENOENT: no such file");
});

it("maps generic Error without a known syscall code to Failure exit code", () => {
  const result = formatMmeError(new Error("boom"));
  expect(result.exitCode).toBe(ExitCode.Failure);
  expect(result.message).toBe("[mme] boom");
});

it("falls back to String() for non-Error throws", () => {
  expect(formatMmeError("string failure")).toEqual({
    message: "string failure",
    exitCode: ExitCode.Failure,
  });
  expect(formatMmeError(123)).toEqual({ message: "123", exitCode: ExitCode.Failure });
  expect(formatMmeError(null)).toEqual({ message: "null", exitCode: ExitCode.Failure });
  expect(formatMmeError(undefined)).toEqual({ message: "undefined", exitCode: ExitCode.Failure });
});
