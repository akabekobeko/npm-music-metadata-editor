import { describe, expect, it } from "vitest";
import { boldBlue, gray, red, resolveColorMode, yellow } from "./colors.js";

const ESC = "\x1b";

describe("resolveColorMode", () => {
  it("disables color when --no-color is set even on a TTY", () => {
    expect(resolveColorMode({ noColor: true, env: {}, isTty: true })).toBe(false);
  });

  it("disables color when NO_COLOR is set, regardless of TTY", () => {
    expect(resolveColorMode({ noColor: false, env: { NO_COLOR: "1" }, isTty: true })).toBe(false);
    expect(resolveColorMode({ noColor: false, env: { NO_COLOR: "" }, isTty: true })).toBe(false);
  });

  it("disables color when stderr is not a TTY", () => {
    expect(resolveColorMode({ noColor: false, env: {}, isTty: false })).toBe(false);
  });

  it("enables color when stderr is a TTY and no opt-out flag is set", () => {
    expect(resolveColorMode({ noColor: false, env: {}, isTty: true })).toBe(true);
  });

  it("FORCE_COLOR=1 overrides NO_COLOR and --no-color", () => {
    expect(
      resolveColorMode({
        noColor: true,
        env: { FORCE_COLOR: "1", NO_COLOR: "1" },
        isTty: false,
      }),
    ).toBe(true);
  });

  it("FORCE_COLOR=0 (or empty) does not enable color", () => {
    expect(resolveColorMode({ noColor: false, env: { FORCE_COLOR: "0" }, isTty: false })).toBe(
      false,
    );
    expect(resolveColorMode({ noColor: false, env: { FORCE_COLOR: "" }, isTty: false })).toBe(
      false,
    );
  });
});

describe("color helpers", () => {
  it("emit raw text when color is disabled", () => {
    expect(red("hello", false)).toBe("hello");
    expect(yellow("hello", false)).toBe("hello");
    expect(gray("hello", false)).toBe("hello");
    expect(boldBlue("hello", false)).toBe("hello");
  });

  it("wrap with the documented SGR codes when color is enabled", () => {
    expect(red("hello", true)).toBe(`${ESC}[31mhello${ESC}[0m`);
    expect(yellow("hello", true)).toBe(`${ESC}[33mhello${ESC}[0m`);
    expect(gray("hello", true)).toBe(`${ESC}[90mhello${ESC}[0m`);
    expect(boldBlue("hello", true)).toBe(`${ESC}[1;34mhello${ESC}[0m`);
  });
});
