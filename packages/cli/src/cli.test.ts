import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { createProgram, runCli } from "./cli.js";
import { ExitCode } from "./errors/exitCodes.js";

const require = createRequire(import.meta.url);
const packageMeta = require("../package.json") as { version: string };

describe("createProgram", () => {
  it("registers the canonical program name 'mme'", () => {
    expect(createProgram().name()).toBe("mme");
  });

  it("returns a fresh Command on every call (no shared state)", () => {
    expect(createProgram()).not.toBe(createProgram());
  });

  it("declares the global --no-color and --quiet flags", () => {
    const program = createProgram();
    const flags = program.options.map((option) => option.long);
    expect(flags).toContain("--no-color");
    expect(flags).toContain("--quiet");
  });
});

describe("runCli", () => {
  it("prints the package version on --version and exits 0", async () => {
    const result = await runCli(["--version"]);
    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stdout.trim()).toBe(packageMeta.version);
    expect(result.stderr).toBe("");
  });

  it("prints usage on --help and exits 0", async () => {
    const result = await runCli(["--help"]);
    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("mme");
  });

  it("treats an unknown subcommand as Usage failure", async () => {
    const result = await runCli(["unknown"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("[mme]");
  });

  it("restores process.stdout / process.stderr writers after running", async () => {
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;
    await runCli(["--version"]);
    expect(process.stdout.write).toBe(originalStdoutWrite);
    expect(process.stderr.write).toBe(originalStderrWrite);
  });
});
