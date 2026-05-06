import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { expandDroppedPaths } from "./expandDroppedPaths.js";

let workdir = "";

beforeEach(async () => {
  workdir = await mkdtemp(path.join(tmpdir(), "mme-dnd-"));
});

afterEach(async () => {
  if (workdir !== "") {
    await rm(workdir, { recursive: true, force: true });
  }
});

/**
 * Touch an empty file at `target`, creating any missing parent dirs.
 *
 * @param target - Absolute file path.
 */
const touch = async (target: string): Promise<void> => {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, new Uint8Array());
};

it("returns the dropped file unchanged when its extension is audio", async () => {
  const file = path.join(workdir, "song.mp3");
  await touch(file);
  const result = await expandDroppedPaths({ paths: [file] });
  expect(result).toEqual([file]);
});

it("filters out non-audio files inside a flat folder", async () => {
  const songPath = path.join(workdir, "a", "song.flac");
  const noisePath = path.join(workdir, "a", "notes.txt");
  await touch(songPath);
  await touch(noisePath);
  const result = await expandDroppedPaths({ paths: [path.join(workdir, "a")] });
  expect(result).toEqual([songPath]);
});

it("walks up to maxDepth levels and stops past the limit", async () => {
  const shallow = path.join(workdir, "lv1", "shallow.mp3");
  const deep = path.join(workdir, "lv1", "lv2", "lv3", "lv4", "deep.mp3");
  await touch(shallow);
  await touch(deep);
  const lvl3 = path.join(workdir, "lv1", "lv2", "lv3", "ok.mp3");
  await touch(lvl3);

  const result = await expandDroppedPaths({ paths: [workdir], maxDepth: 3 });
  expect(result).toContain(shallow);
  expect(result).toContain(lvl3);
  expect(result).not.toContain(deep);
});

it("treats extension comparison as case-insensitive", async () => {
  const upper = path.join(workdir, "TRACK.MP3");
  await touch(upper);
  const result = await expandDroppedPaths({ paths: [upper] });
  expect(result).toEqual([upper]);
});

it("skips symbolic links rather than following them", async () => {
  const real = path.join(workdir, "real.mp3");
  await touch(real);
  const link = path.join(workdir, "link.mp3");
  await symlink(real, link);

  const result = await expandDroppedPaths({ paths: [link] });
  expect(result).toEqual([]);

  const folderLink = path.join(workdir, "folderLink");
  const targetFolder = path.join(workdir, "audio");
  await touch(path.join(targetFolder, "song.flac"));
  await symlink(targetFolder, folderLink);
  const folderResult = await expandDroppedPaths({ paths: [folderLink] });
  expect(folderResult).toEqual([]);
});

it("deduplicates files that appear from multiple drops", async () => {
  const song = path.join(workdir, "track.mp3");
  await touch(song);
  const result = await expandDroppedPaths({
    paths: [song, song, workdir],
  });
  expect(result).toEqual([song]);
});

it("returns an empty list for unreadable / non-existent paths", async () => {
  const result = await expandDroppedPaths({
    paths: [path.join(workdir, "missing", "still.mp3")],
  });
  expect(result).toEqual([]);
});
