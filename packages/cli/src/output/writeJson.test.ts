import { afterEach, expect, it, vi } from "vitest";
import { writeJson } from "./writeJson.js";

const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

afterEach(() => {
  writeSpy.mockClear();
});

it("emits indented JSON terminated by a newline", () => {
  writeJson({ a: 1, b: "two" });
  expect(writeSpy).toHaveBeenCalledOnce();
  expect(writeSpy.mock.calls[0]?.[0]).toBe(`${JSON.stringify({ a: 1, b: "two" }, null, 2)}\n`);
});

it("preserves nested arrays and objects", () => {
  writeJson({ list: [1, 2, { nested: true }] });
  const written = writeSpy.mock.calls[0]?.[0];
  expect(typeof written).toBe("string");
  expect(written as string).toContain('"nested": true');
  expect((written as string).endsWith("\n")).toBe(true);
});
