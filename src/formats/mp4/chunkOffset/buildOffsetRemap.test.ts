import { describe, expect, it } from "vitest";
import { buildOffsetRemap } from "./buildOffsetRemap.js";

describe("buildOffsetRemap", () => {
  it("shifts offsets at or past the changed-atom end", () => {
    const remap = buildOffsetRemap({
      changedAtomOffset: 100,
      changedAtomOldSize: 50,
      changedAtomNewSize: 75,
    });

    expect(remap(50)).toBe(50); // before the changed atom
    expect(remap(100)).toBe(100); // start of the changed atom
    expect(remap(149)).toBe(149); // last byte still inside the old extent
    expect(remap(150)).toBe(175); // first byte after old extent
    expect(remap(1000)).toBe(1025);
  });

  it("subtracts when the atom shrinks", () => {
    const remap = buildOffsetRemap({
      changedAtomOffset: 100,
      changedAtomOldSize: 50,
      changedAtomNewSize: 30,
    });
    expect(remap(150)).toBe(130);
    expect(remap(1000)).toBe(980);
  });
});
