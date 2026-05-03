import { Command } from "commander";
import { expect, it } from "vitest";
import { registerVersionAndHelp } from "./registerVersionAndHelp.js";

it("returns the same Command instance to enable chaining", () => {
  const program = new Command();
  expect(registerVersionAndHelp(program, "1.2.3")).toBe(program);
});

it("sets the program name to 'mme'", () => {
  const program = registerVersionAndHelp(new Command(), "1.2.3");
  expect(program.name()).toBe("mme");
});

it("registers the version string passed in", () => {
  const program = registerVersionAndHelp(new Command(), "9.9.9");
  expect(program.version()).toBe("9.9.9");
});

it("registers the global --no-color and --quiet options", () => {
  const program = registerVersionAndHelp(new Command(), "1.2.3");
  const longFlags = program.options.map((option) => option.long);
  expect(longFlags).toContain("--no-color");
  expect(longFlags).toContain("--quiet");
});
