import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { ItunesDataType } from "../../constants.js";
import { tagToItunesAtoms } from "./tagToItunesAtoms.js";

it("emits the canonical 4-character atom codes for each TagData field", () => {
  const atoms = tagToItunesAtoms({
    tag: {
      title: "Hello",
      artist: "Tester",
      album: "Album",
      bpm: 120,
    },
  });

  const names = atoms.map((a) => a.name);
  expect(names).toContain("©nam");
  expect(names).toContain("©ART");
  expect(names).toContain("©alb");
  expect(names).toContain("tmpo");
});

it("encodes track numbers as `trkn` with the iTunes 8-byte trailing-pad layout", () => {
  const atoms = tagToItunesAtoms({ tag: { trackNumber: 3, trackTotal: 12 } });

  const trkn = atoms.find((a) => a.name === "trkn");
  expect(trkn).toBeDefined();
  expect(trkn?.values[0]?.typeIndicator).toBe(ItunesDataType.Implicit);
  // 4-byte zero pad + 2-byte number + 2-byte total + 2-byte trailing pad = 10 bytes total,
  // but the trailing pad is 2 zero bytes appended to a 6-byte payload to make 8.
  expect(trkn?.values[0]?.data.length).toBe(8);
});

it("encodes disc numbers as `disk` *without* the trailing pad", () => {
  const atoms = tagToItunesAtoms({ tag: { discNumber: 1, discTotal: 2 } });

  const disk = atoms.find((a) => a.name === "disk");
  expect(disk).toBeDefined();
  expect(disk?.values[0]?.data.length).toBe(6);
});

it("emits LYRICIST as a `----` freeform atom", () => {
  const atoms = tagToItunesAtoms({ tag: { lyricist: "Someone" } });

  const freeform = atoms.find((a) => a.name === "----");
  expect(freeform?.meanName).toBe("LYRICIST");
});

it("emits PRODUCER as a `----` freeform atom", () => {
  const atoms = tagToItunesAtoms({ tag: { producer: "Alice" } });

  const freeform = atoms.find((a) => a.name === "----");
  expect(freeform?.meanName).toBe("PRODUCER");
});

it("prefers recordingDate over year when both are set", () => {
  const atoms = tagToItunesAtoms({ tag: { recordingDate: "2025-04-30", year: 2024 } });

  const day = atoms.filter((a) => a.name === "©day");
  expect(day).toHaveLength(1);
  expect(day[0]?.values[0]?.data).toBeDefined();
});

it("emits no covr atom when no pictures are passed", () => {
  const atoms = tagToItunesAtoms({ tag: { title: "Hello" } });

  expect(atoms.some((a) => a.name === "covr")).toBe(false);
});

it("emits a tombstone (atom without values) for a text field set to null or empty string", () => {
  const atoms = tagToItunesAtoms({ tag: { title: null, album: "" } });
  expect(atoms).toEqual([
    { name: "©nam", values: [] },
    { name: "©alb", values: [] },
  ]);
});

it("emits tombstones for numeric fields set to null", () => {
  const atoms = tagToItunesAtoms({ tag: { bpm: null, rating: null, trackNumber: null } });
  expect(atoms.map((a) => a.name)).toEqual(["tmpo", "rtng", "trkn"]);
  expect(atoms.every((a) => a.values.length === 0)).toBe(true);
});

it("skips fields left undefined entirely", () => {
  expect(tagToItunesAtoms({ tag: { bpm: undefined, title: undefined } })).toEqual([]);
});

it("falls back to year for ©day when recordingDate is cleared", () => {
  const atoms = tagToItunesAtoms({ tag: { recordingDate: "", year: 2024 } });
  const day = atoms.find((a) => a.name === "©day");
  expect(day).toBeDefined();
  expect(Buffer.from(day?.values[0]?.data ?? []).toString("utf8")).toBe("2024");
});

it("emits a ©day tombstone when both year and recordingDate are cleared", () => {
  const atoms = tagToItunesAtoms({ tag: { recordingDate: null, year: null } });
  expect(atoms).toEqual([{ name: "©day", values: [] }]);
});

it("emits a freeform tombstone keyed by meanName", () => {
  const atoms = tagToItunesAtoms({ tag: { lyricist: null } });
  expect(atoms).toEqual([{ name: "----", meanName: "LYRICIST", values: [] }]);
});

it("emits a covr tombstone for an empty pictures array", () => {
  const atoms = tagToItunesAtoms({ tag: {}, pictures: [] });
  expect(atoms).toEqual([{ name: "covr", values: [] }]);
});
