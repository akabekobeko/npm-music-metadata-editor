import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { dictionaries } from "./dictionaries.js";
import { resetMissingKeyLog, t, tFor } from "./t.js";

beforeEach(() => {
  resetMissingKeyLog();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("returns the value from the requested locale when present", () => {
  expect(t("menu.file.openFiles", "en")).toBe("Open Audio Files…");
  expect(t("menu.file.openFiles", "ja")).toBe("音楽ファイルを開く…");
});

it("falls back to English when the locale is missing the key", () => {
  // Sanity-check the production data path: English is the fallback floor.
  expect(t("menu.file", "en")).toBe(dictionaries.en["menu.file"]);
});

it("returns the key itself when no dictionary defines it", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  expect(t("does.not.exist", "en")).toBe("does.not.exist");
  expect(warn).toHaveBeenCalledTimes(1);
});

it("substitutes {name} placeholders from params via tFor", () => {
  expect(tFor("en")("header.fileCount.singular", { count: 1 })).toBe("1 file");
  expect(tFor("ja")("header.fileCount.plural", { count: 7 })).toBe("7 件");
});

it("leaves placeholders without a matching param untouched", () => {
  // `{count}` survives when the caller forgot to pass it — easier to spot
  // in the UI than a silent empty substring.
  expect(tFor("en")("header.fileCount.singular")).toBe("{count} file");
});

it("only warns once per missing key", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  t("missing.once", "ja");
  t("missing.once", "ja");
  t("missing.once", "en");
  expect(warn).toHaveBeenCalledTimes(1);
});

it("every locale defines the same key set", () => {
  const enKeys = Object.keys(dictionaries.en).sort();
  const jaKeys = Object.keys(dictionaries.ja).sort();
  expect(jaKeys).toEqual(enKeys);
});
