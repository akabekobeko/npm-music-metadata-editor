import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
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
  workDir = await mkdtemp(path.join(tmpdir(), "mme-lyrics-e2e-"));
  workMp3 = path.join(workDir, "song.mp3");
  await copyFile(sampleMp3, workMp3);
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("mme lyrics set / get / clear", () => {
  it("set --text + get --format text round-trips plain lyrics", async () => {
    const textFile = path.join(workDir, "lyrics.txt");
    await writeFile(textFile, "Line 1\nLine 2\n");

    const set = await runCli(["lyrics", "set", workMp3, "--text", textFile]);
    expect(set.exitCode).toBe(ExitCode.Success);

    const get = await runCli(["lyrics", "get", workMp3]);
    expect(get.exitCode).toBe(ExitCode.Success);
    expect(get.stdout.trimEnd()).toBe("Line 1\nLine 2");
  });

  it("set --lrc + get --format lrc round-trips synchronized lyrics", async () => {
    const lrcFile = path.join(workDir, "lyrics.lrc");
    await writeFile(lrcFile, "[00:01.00]Hello\n[00:02.50]World\n");

    const set = await runCli(["lyrics", "set", workMp3, "--lrc", lrcFile]);
    expect(set.exitCode).toBe(ExitCode.Success);

    const get = await runCli(["lyrics", "get", workMp3, "--format", "lrc"]);
    expect(get.exitCode).toBe(ExitCode.Success);
    expect(get.stdout.trimEnd()).toBe("[00:01.00]Hello\n[00:02.50]World");
  });

  it("set --lrc populates the unsynchronized fallback as joined text", async () => {
    const lrcFile = path.join(workDir, "lyrics.lrc");
    await writeFile(lrcFile, "[00:01.00]Hello\n[00:02.50]World\n");
    await runCli(["lyrics", "set", workMp3, "--lrc", lrcFile]);

    const get = await runCli(["lyrics", "get", workMp3, "--format", "text"]);
    expect(get.exitCode).toBe(ExitCode.Success);
    expect(get.stdout.trimEnd()).toBe("Hello\nWorld");
  });

  it("set --json round-trips through get --format json", async () => {
    const jsonFile = path.join(workDir, "lyrics.json");
    const payload = {
      language: "eng",
      description: "Lyrics",
      unsynchronized: "From JSON",
    };
    await writeFile(jsonFile, JSON.stringify(payload));

    const set = await runCli(["lyrics", "set", workMp3, "--json", jsonFile]);
    expect(set.exitCode).toBe(ExitCode.Success);

    const get = await runCli(["lyrics", "get", workMp3, "--format", "json"]);
    expect(get.exitCode).toBe(ExitCode.Success);
    const parsed = JSON.parse(get.stdout) as Record<string, unknown>;
    expect(parsed.unsynchronized).toBe("From JSON");
  });

  it("set --text --language overlays the language tag", async () => {
    const textFile = path.join(workDir, "lyrics.txt");
    await writeFile(textFile, "Lalala");
    await runCli(["lyrics", "set", workMp3, "--text", textFile, "--language", "eng"]);

    const get = await runCli(["lyrics", "get", workMp3, "--format", "json"]);
    const parsed = JSON.parse(get.stdout) as { language?: string };
    expect(parsed.language).toBe("eng");
  });

  it("set with two source flags is rejected with exit 2", async () => {
    const result = await runCli([
      "lyrics",
      "set",
      workMp3,
      "--text",
      "/dev/null",
      "--lrc",
      "/dev/null",
    ]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("mutually exclusive");
  });

  it("set without any source flag is rejected with exit 2", async () => {
    const result = await runCli(["lyrics", "set", workMp3]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("requires one of");
  });

  it("clear removes lyrics so subsequent get fails with exit 1", async () => {
    const textFile = path.join(workDir, "lyrics.txt");
    await writeFile(textFile, "anything");
    await runCli(["lyrics", "set", workMp3, "--text", textFile]);

    const cleared = await runCli(["lyrics", "clear", workMp3]);
    expect(cleared.exitCode).toBe(ExitCode.Success);

    const get = await runCli(["lyrics", "get", workMp3]);
    expect(get.exitCode).toBe(ExitCode.Failure);
    expect(get.stderr).toContain("no");
  });

  it("get --format unknown is rejected with exit 2", async () => {
    const result = await runCli(["lyrics", "get", workMp3, "--format", "bogus"]);
    expect(result.exitCode).toBe(ExitCode.Usage);
    expect(result.stderr).toContain("unknown lyrics format");
  });
});
