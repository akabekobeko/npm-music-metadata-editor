import { expect, it } from "vitest";
import { resolveTheme } from "./resolveTheme.js";

it("returns the explicit preference when light or dark", () => {
  expect(resolveTheme({ preference: "light", prefersDark: true })).toBe("light");
  expect(resolveTheme({ preference: "dark", prefersDark: false })).toBe("dark");
});

it("uses prefers-color-scheme when preference is system or unset", () => {
  expect(resolveTheme({ preference: "system", prefersDark: true })).toBe("dark");
  expect(resolveTheme({ preference: "system", prefersDark: false })).toBe("light");
  expect(resolveTheme({ preference: undefined, prefersDark: true })).toBe("dark");
  expect(resolveTheme({ preference: undefined, prefersDark: false })).toBe("light");
});
