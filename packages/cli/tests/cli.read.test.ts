import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ExitCode } from "../src/errors/exitCodes.js";
import { runCli } from "./cliRunner.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const sampleMp3 = path.resolve(here, "fixtures/mp3/sample.mp3");
const minimalMp3 = path.resolve(here, "fixtures/mp3/minimal.mp3");

describe("mme read — file mode", () => {
  it("emits JSON with the documented schema by default", async () => {
    const result = await runCli(["read", sampleMp3]);
    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stderr).toBe("");
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(parsed.audioFormat).toBe("mp3");
    expect(parsed).toHaveProperty("tag");
    expect(parsed).toHaveProperty("pictures");
    expect(parsed).toHaveProperty("chapters");
    expect(parsed).toHaveProperty("additionalFields");
    expect(parsed).toHaveProperty("warnings");
    expect((parsed.tag as Record<string, unknown>).title).toBe("CLI Sample");
  });

  it("scrubs raw picture data and replaces it with byteLength", async () => {
    const result = await runCli(["read", sampleMp3]);
    const parsed = JSON.parse(result.stdout) as { pictures: Array<Record<string, unknown>> };
    expect(parsed.pictures).toHaveLength(1);
    expect(parsed.pictures[0]).toHaveProperty("byteLength");
    expect(parsed.pictures[0]).not.toHaveProperty("data");
  });

  it("--pretty produces human-readable output with the documented labels", async () => {
    const result = await runCli(["read", sampleMp3, "--pretty"]);
    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stdout).toContain("Format");
    expect(result.stdout).toContain("Title");
    expect(result.stdout).toContain("CLI Sample");
    expect(result.stdout).toContain("Track");
    expect(result.stdout).toContain("Pictures");
  });

  it("--field returns a single value without JSON quoting", async () => {
    const result = await runCli(["read", sampleMp3, "--field", "tag.title"]);
    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stdout).toBe("CLI Sample\n");
  });

  it("--field accepts the implicit `tag.` prefix", async () => {
    const result = await runCli(["read", sampleMp3, "--field", "title"]);
    expect(result.stdout).toBe("CLI Sample\n");
  });

  it("--field for a top-level value still works", async () => {
    const result = await runCli(["read", sampleMp3, "--field", "audioFormat"]);
    expect(result.stdout).toBe("mp3\n");
  });

  it("--field for compound values renders JSON", async () => {
    const result = await runCli(["read", sampleMp3, "--field", "tag"]);
    expect(result.stdout.trim().startsWith("{")).toBe(true);
    expect(result.stdout).toContain('"title": "CLI Sample"');
  });

  it('--field unresolved path → exit 1 + [mme] field "X" not found', async () => {
    const result = await runCli(["read", sampleMp3, "--field", "nonexistent"]);
    expect(result.exitCode).toBe(ExitCode.Failure);
    expect(result.stderr).toContain('[mme] field "nonexistent" not found');
    expect(result.stdout).toBe("");
  });

  it("--include narrows the output to listed sections", async () => {
    const result = await runCli(["read", sampleMp3, "--include", "audioFormat,tag"]);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(["audioFormat", "tag"]);
  });

  it("--exclude removes listed sections", async () => {
    const result = await runCli(["read", sampleMp3, "--exclude", "pictures,warnings"]);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty("pictures");
    expect(parsed).not.toHaveProperty("warnings");
    expect(parsed).toHaveProperty("audioFormat");
  });

  it("--no-warnings drops warnings from the JSON output", async () => {
    const result = await runCli(["read", sampleMp3, "--no-warnings"]);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty("warnings");
  });

  it("works on a minimal MP3 fixture without pictures", async () => {
    const result = await runCli(["read", minimalMp3]);
    const parsed = JSON.parse(result.stdout) as { pictures: unknown[] };
    expect(parsed.pictures).toEqual([]);
  });
});

describe("mme read — stdin mode", () => {
  it("reads bytes piped through stdin when --stdin and --format are set", async () => {
    const bytes = await readFile(sampleMp3);
    const result = await runCli(["read", "--stdin", "--format", "mp3", "--field", "title"], {
      stdin: new Uint8Array(bytes),
    });
    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stdout).toBe("CLI Sample\n");
  });
});

describe("mme read — exclusive flags exit with code 2", () => {
  it("--stdin + file argument", async () => {
    const result = await runCli(["read", sampleMp3, "--stdin", "--format", "mp3"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("[mme]");
  });

  it("--pretty + --field", async () => {
    const result = await runCli(["read", sampleMp3, "--pretty", "--field", "title"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("[mme]");
  });

  it("--include + --exclude", async () => {
    const result = await runCli(["read", sampleMp3, "--include", "tag", "--exclude", "warnings"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("[mme]");
  });

  it("--stdin without --format", async () => {
    const result = await runCli(["read", "--stdin"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("--format");
  });

  it("--stdin + unknown --format", async () => {
    const result = await runCli(["read", "--stdin", "--format", "ogm"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("unknown audio format");
  });

  it("--include + invalid section", async () => {
    const result = await runCli(["read", sampleMp3, "--include", "tag,bogus"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("unknown section");
  });

  it("--field overrides --include with a stderr warning", async () => {
    const result = await runCli(["read", sampleMp3, "--field", "title", "--include", "tag"]);
    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stdout).toBe("CLI Sample\n");
    expect(result.stderr).toContain("--include is ignored when --field is set");
  });
});
