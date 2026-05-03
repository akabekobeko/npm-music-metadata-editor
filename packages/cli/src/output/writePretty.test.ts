import { afterEach, expect, it, vi } from "vitest";
import { writePretty } from "./writePretty.js";

const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

afterEach(() => {
  writeSpy.mockClear();
});

it("falls back to JSON output", () => {
  writePretty({ title: "Hello" });
  expect(writeSpy).toHaveBeenCalledOnce();
  expect(writeSpy.mock.calls[0]?.[0]).toBe(`${JSON.stringify({ title: "Hello" }, null, 2)}\n`);
});
