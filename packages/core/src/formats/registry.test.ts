import { afterEach, expect, it } from "vitest";
import {
  clearRegistrations,
  getAllRegistrations,
  getRegistration,
  registerFormat,
} from "./registry.js";

afterEach(() => {
  clearRegistrations();
});

it("returns undefined when nothing is registered", () => {
  expect(getRegistration("mp3")).toBeUndefined();
  expect(getAllRegistrations()).toEqual([]);
});

it("registers a format and looks it up by id", () => {
  registerFormat({
    format: "mp3",
    extensions: [".mp3"],
    detectSignature: (header) => header.length >= 3 && header[0] === 0x49,
  });
  const reg = getRegistration("mp3");
  expect(reg).toBeDefined();
  expect(reg?.extensions).toEqual([".mp3"]);
  expect(getAllRegistrations()).toHaveLength(1);
});

it("replaces an existing registration on re-register", () => {
  registerFormat({
    format: "flac",
    extensions: [".flac"],
    detectSignature: () => false,
  });
  registerFormat({
    format: "flac",
    extensions: [".flac", ".fla"],
    detectSignature: () => true,
  });
  expect(getAllRegistrations()).toHaveLength(1);
  expect(getRegistration("flac")?.extensions).toEqual([".flac", ".fla"]);
});
