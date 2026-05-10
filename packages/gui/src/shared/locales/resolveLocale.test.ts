import { expect, it } from "vitest";
import { resolveLocale } from "./resolveLocale.js";

it("returns the user preference when it is a supported locale", () => {
  expect(resolveLocale({ preference: "ja", systemLocale: "en-US" })).toBe("ja");
});

it("falls back to system locale when the user has no preference", () => {
  expect(resolveLocale({ preference: undefined, systemLocale: "ja-JP" })).toBe("ja");
});

it("normalises locale tags with underscores or upper case", () => {
  expect(resolveLocale({ preference: undefined, systemLocale: "ja_JP" })).toBe("ja");
  expect(resolveLocale({ preference: undefined, systemLocale: "JA" })).toBe("ja");
});

it("returns English when neither preference nor system locale matches", () => {
  expect(resolveLocale({ preference: undefined, systemLocale: "fr-FR" })).toBe("en");
  expect(resolveLocale({ preference: undefined, systemLocale: undefined })).toBe("en");
});

it("ignores an unsupported preference and falls back to system / English", () => {
  expect(resolveLocale({ preference: "fr" as unknown as "en", systemLocale: "ja-JP" })).toBe("ja");
  expect(resolveLocale({ preference: "fr" as unknown as "en", systemLocale: "fr-FR" })).toBe("en");
});

it('treats the explicit "system" preference like an unset preference', () => {
  expect(resolveLocale({ preference: "system", systemLocale: "ja-JP" })).toBe("ja");
  expect(resolveLocale({ preference: "system", systemLocale: "fr-FR" })).toBe("en");
  expect(resolveLocale({ preference: "system", systemLocale: undefined })).toBe("en");
});
