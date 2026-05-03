import { copyFile, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ExitCode } from "../src/errors/exitCodes.js";
import { runCli } from "./cliRunner.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const sampleMp3 = path.resolve(here, "fixtures/mp3/sample.mp3");

let workDir: string;
let workMp3: string;

beforeEach(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "mme-write-e2e-"));
  workMp3 = path.join(workDir, "song.mp3");
  await copyFile(sampleMp3, workMp3);
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

/**
 * Read `tag.title` from a file via `mme read --field title`.
 *
 * @param file - Path to the audio file.
 * @returns The trimmed title string (or an empty string when unset).
 */
const readTitle = async (file: string): Promise<string> => {
  const result = await runCli(["read", file, "--field", "title"]);
  expect(result.exitCode).toBe(ExitCode.Success);
  return result.stdout.trimEnd();
};

describe("mme write — file mode", () => {
  it("rewrites a single field and reads it back identically", async () => {
    const write = await runCli(["write", workMp3, "--title", "New Title"]);
    expect(write.exitCode).toBe(ExitCode.Success);
    expect(write.stdout).toBe("");
    expect(write.stderr).toContain("[mme] wrote:");
    expect(write.stderr).toContain(workMp3);
    expect(await readTitle(workMp3)).toBe("New Title");
  });

  it("rewrites multiple scalar fields in one invocation", async () => {
    const write = await runCli([
      "write",
      workMp3,
      "--title",
      "T",
      "--artist",
      "A",
      "--year",
      "2030",
      "--track",
      "5/9",
    ]);
    expect(write.exitCode).toBe(ExitCode.Success);
    const dump = await runCli(["read", workMp3]);
    const parsed = JSON.parse(dump.stdout) as {
      tag: {
        title?: string;
        artist?: string;
        year?: number;
        trackNumber?: number;
        trackTotal?: number;
      };
    };
    expect(parsed.tag.title).toBe("T");
    expect(parsed.tag.artist).toBe("A");
    expect(parsed.tag.year).toBe(2030);
    expect(parsed.tag.trackNumber).toBe(5);
    expect(parsed.tag.trackTotal).toBe(9);
  });

  it("--clear drops a field while leaving siblings intact", async () => {
    await runCli(["write", workMp3, "--clear", "title"]);
    const dump = await runCli(["read", workMp3]);
    const parsed = JSON.parse(dump.stdout) as { tag: Record<string, unknown> };
    expect(parsed.tag.title).toBeUndefined();
    expect(parsed.tag.artist).toBe("CLI Tester");
  });

  it("--json bulk-applies tag fields and is overridden by individual flags", async () => {
    const write = await runCli([
      "write",
      workMp3,
      "--json",
      JSON.stringify({ title: "From JSON", artist: "From JSON" }),
      "--title",
      "Override",
    ]);
    expect(write.exitCode).toBe(ExitCode.Success);
    const dump = await runCli(["read", workMp3]);
    const parsed = JSON.parse(dump.stdout) as { tag: { title?: string; artist?: string } };
    expect(parsed.tag.title).toBe("Override");
    expect(parsed.tag.artist).toBe("From JSON");
  });

  it("--tag-file reads a JSON file from disk", async () => {
    const tagFile = path.join(workDir, "patch.json");
    await writeFile(tagFile, JSON.stringify({ title: "From TagFile", year: 1999 }));
    await runCli(["write", workMp3, "--tag-file", tagFile]);
    const dump = await runCli(["read", workMp3]);
    const parsed = JSON.parse(dump.stdout) as { tag: { title?: string; year?: number } };
    expect(parsed.tag.title).toBe("From TagFile");
    expect(parsed.tag.year).toBe(1999);
  });

  it("--output writes to a different path and leaves the source untouched", async () => {
    const target = path.join(workDir, "out.mp3");
    const before = await readFile(workMp3);
    await runCli(["write", workMp3, "--title", "Written Out", "--output", target]);
    expect(await readTitle(target)).toBe("Written Out");
    const afterSource = await readFile(workMp3);
    expect(Buffer.compare(before, afterSource)).toBe(0);
  });

  it("--dry-run renders the post-edit Track and leaves the file untouched", async () => {
    const before = await stat(workMp3);
    const result = await runCli(["write", workMp3, "--title", "Dry Run", "--dry-run"]);
    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stderr).toBe("");
    const parsed = JSON.parse(result.stdout) as { tag: { title?: string } };
    expect(parsed.tag.title).toBe("Dry Run");
    expect(await readTitle(workMp3)).toBe("CLI Sample");
    const after = await stat(workMp3);
    expect(after.mtimeMs).toBe(before.mtimeMs);
    expect(after.size).toBe(before.size);
  });

  it("--no-atomic still produces a correct in-place overwrite", async () => {
    await runCli(["write", workMp3, "--title", "No Atomic", "--no-atomic"]);
    expect(await readTitle(workMp3)).toBe("No Atomic");
  });
});

describe("mme write — stream mode", () => {
  it("rewrites bytes piped through stdin and emits them to stdout", async () => {
    const input = await readFile(sampleMp3);
    const result = await runCli(
      ["write", "--stdin", "--format", "mp3", "--title", "Pipeline", "--output", "-"],
      { stdin: new Uint8Array(input) },
    );
    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stderr).toContain("[mme] wrote: <stdout>");

    const tmp = path.join(workDir, "piped.mp3");
    await writeFile(tmp, result.stdoutBytes);
    expect(await readTitle(tmp)).toBe("Pipeline");
  });

  it("can write piped bytes to an --output <path>", async () => {
    const input = await readFile(sampleMp3);
    const target = path.join(workDir, "piped-out.mp3");
    const result = await runCli(
      ["write", "--stdin", "--format", "mp3", "--title", "ToFile", "--output", target],
      { stdin: new Uint8Array(input) },
    );
    expect(result.exitCode).toBe(ExitCode.Success);
    expect(await readTitle(target)).toBe("ToFile");
  });
});

describe("mme write — exclusive flags exit with code 2", () => {
  it("file argument + --stdin", async () => {
    const result = await runCli(["write", workMp3, "--stdin", "--format", "mp3", "--output", "-"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("[mme]");
  });

  it("--clear F + --F together", async () => {
    const result = await runCli(["write", workMp3, "--title", "X", "--clear", "title"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("cannot --title and --clear title");
  });

  it("--stdin + --clear is rejected (stream mode cannot clear)", async () => {
    const result = await runCli([
      "write",
      "--stdin",
      "--format",
      "mp3",
      "--clear",
      "title",
      "--output",
      "-",
    ]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("--clear");
  });

  it("--dry-run + --output -", async () => {
    const result = await runCli([
      "write",
      "--stdin",
      "--format",
      "mp3",
      "--dry-run",
      "--output",
      "-",
    ]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("[mme]");
  });

  it("--stdin without --format", async () => {
    const result = await runCli(["write", "--stdin", "--output", "-"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("--format");
  });

  it("--stdin without --output", async () => {
    const input = await readFile(sampleMp3);
    const result = await runCli(["write", "--stdin", "--format", "mp3", "--title", "X"], {
      stdin: new Uint8Array(input),
    });
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("--output");
  });

  it("--output - without --stdin", async () => {
    const result = await runCli(["write", workMp3, "--output", "-"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("--output -");
  });

  it("--year with non-integer value", async () => {
    const result = await runCli(["write", workMp3, "--year", "abc"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("expected an integer");
  });

  it("--clear with unknown field", async () => {
    const result = await runCli(["write", workMp3, "--clear", "bogus"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("unknown field");
  });
});
