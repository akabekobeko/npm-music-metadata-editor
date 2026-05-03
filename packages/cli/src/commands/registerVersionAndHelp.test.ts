import type { EventEmitter } from "node:events";
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

it("registers the global --no-color / --quiet / --verbose options", () => {
  const program = registerVersionAndHelp(new Command(), "1.2.3");
  const longFlags = program.options.map((option) => option.long);
  expect(longFlags).toContain("--no-color");
  expect(longFlags).toContain("--quiet");
  expect(longFlags).toContain("--verbose");
});

it("registers an Examples block via addHelpText (verified through runCli)", () => {
  // commander's `helpInformation()` does not splice in `addHelpText("after",
  // …)` content — that text is appended by the help-event listener that
  // fires during the `--help` flow. The end-to-end check in
  // `src/cli.test.ts` ("includes the Examples block in the root --help
  // output") covers the rendered surface; this case keeps the unit
  // assertion cheap by confirming the listener was registered. `Command`
  // extends `EventEmitter` at runtime but the public types omit the helper,
  // so cast to access `listenerCount`.
  const program = registerVersionAndHelp(new Command(), "1.2.3");
  expect((program as unknown as EventEmitter).listenerCount("afterHelp")).toBeGreaterThan(0);
});
