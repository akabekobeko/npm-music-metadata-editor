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
  workDir = await mkdtemp(path.join(tmpdir(), "mme-chapter-e2e-"));
  workMp3 = path.join(workDir, "song.mp3");
  await copyFile(sampleMp3, workMp3);
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

const sampleChapters = [
  { id: "ch1", startMs: 0, endMs: 1500, title: "Intro" },
  { id: "ch2", startMs: 1500, endMs: 3000, title: "Verse" },
];

describe("mme chapter set / list / clear", () => {
  it("set --json writes chapters and list reads them back", async () => {
    const jsonPath = path.join(workDir, "chapters.json");
    await writeFile(jsonPath, JSON.stringify(sampleChapters));

    const set = await runCli(["chapter", "set", workMp3, "--json", jsonPath]);
    expect(set.exitCode).toBe(ExitCode.Success);
    expect(set.stderr).toContain("[mme] wrote:");

    const list = await runCli(["chapter", "list", workMp3]);
    expect(list.exitCode).toBe(ExitCode.Success);
    const parsed = JSON.parse(list.stdout) as readonly {
      id: string;
      startMs: number;
      endMs: number;
      title?: string;
    }[];
    expect(
      parsed.map((c) => ({ id: c.id, startMs: c.startMs, endMs: c.endMs, title: c.title })),
    ).toEqual(sampleChapters);
  });

  it("list --pretty renders the documented table layout", async () => {
    const jsonPath = path.join(workDir, "chapters.json");
    await writeFile(jsonPath, JSON.stringify(sampleChapters));
    await runCli(["chapter", "set", workMp3, "--json", jsonPath]);

    const result = await runCli(["chapter", "list", workMp3, "--pretty"]);
    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stdout).toContain("start");
    expect(result.stdout).toContain("end");
    expect(result.stdout).toContain("Intro");
    expect(result.stdout).toContain("00:00:00");
    expect(result.stdout).toContain("00:00:01");
  });

  it("set rejects out-of-order startMs (exit 2)", async () => {
    const jsonPath = path.join(workDir, "chapters.json");
    await writeFile(
      jsonPath,
      JSON.stringify([
        { id: "a", startMs: 1000, endMs: 2000 },
        { id: "b", startMs: 500, endMs: 1500 },
      ]),
    );

    const set = await runCli(["chapter", "set", workMp3, "--json", jsonPath]);
    expect(set.exitCode).toBe(ExitCode.Usage);
    expect(set.stderr).toContain("must be greater than the previous");
  });

  it("set rejects duplicate ids (exit 2)", async () => {
    const jsonPath = path.join(workDir, "chapters.json");
    await writeFile(
      jsonPath,
      JSON.stringify([
        { id: "dup", startMs: 0, endMs: 500 },
        { id: "dup", startMs: 500, endMs: 1000 },
      ]),
    );
    const set = await runCli(["chapter", "set", workMp3, "--json", jsonPath]);
    expect(set.exitCode).toBe(ExitCode.Usage);
    expect(set.stderr).toContain('duplicate "id"');
  });

  it("set --json - reads from stdin", async () => {
    const payload = Buffer.from(JSON.stringify(sampleChapters), "utf8");
    const set = await runCli(["chapter", "set", workMp3, "--json", "-"], {
      stdin: new Uint8Array(payload),
    });
    expect(set.exitCode).toBe(ExitCode.Success);
    const list = await runCli(["chapter", "list", workMp3]);
    const parsed = JSON.parse(list.stdout) as readonly { id: string }[];
    expect(parsed.map((c) => c.id)).toEqual(["ch1", "ch2"]);
  });

  it("clear empties the chapter list", async () => {
    const jsonPath = path.join(workDir, "chapters.json");
    await writeFile(jsonPath, JSON.stringify(sampleChapters));
    await runCli(["chapter", "set", workMp3, "--json", jsonPath]);

    const cleared = await runCli(["chapter", "clear", workMp3]);
    expect(cleared.exitCode).toBe(ExitCode.Success);
    const list = await runCli(["chapter", "list", workMp3]);
    expect(JSON.parse(list.stdout)).toEqual([]);
  });
});
