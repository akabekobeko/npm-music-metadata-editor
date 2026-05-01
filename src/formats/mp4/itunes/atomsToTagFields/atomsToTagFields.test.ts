import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { ItunesDataType } from "../../constants.js";
import type { ItunesAtom, ItunesDataValue } from "../../types.js";
import { atomsToTagFields } from "./atomsToTagFields.js";

/** Wrap UTF-8 text as an ItunesDataValue. */
const utf8 = (text: string): ItunesDataValue => ({
  typeIndicator: ItunesDataType.Utf8,
  locale: 0,
  data: new Uint8Array(Buffer.from(text, "utf8")),
});

/** Arguments for {@link numberAndTotal}. */
type NumberAndTotalArgs = {
  /** Track / disc number. */
  number: number;
  /** Track / disc total. */
  total: number;
  /** Append the 2-byte trailing pad iTunes adds to `trkn` (and not to `disk`). */
  trailingPad: boolean;
};

/** Wrap a `trkn` / `disk` `(number, total)` payload as an ItunesDataValue. */
const numberAndTotal = ({ number, total, trailingPad }: NumberAndTotalArgs): ItunesDataValue => {
  const buf = Buffer.alloc(trailingPad ? 8 : 6);
  buf.writeUInt16BE(0, 0);
  buf.writeUInt16BE(number, 2);
  buf.writeUInt16BE(total, 4);
  return { typeIndicator: ItunesDataType.Implicit, locale: 0, data: new Uint8Array(buf) };
};

it("projects the canonical iTunes atoms onto TagData", () => {
  const atoms: ItunesAtom[] = [
    { name: "©nam", values: [utf8("Hello")] },
    { name: "©ART", values: [utf8("Tester")] },
    { name: "©alb", values: [utf8("Album")] },
    { name: "trkn", values: [numberAndTotal({ number: 3, total: 12, trailingPad: true })] },
    { name: "©day", values: [utf8("2026-01-01")] },
  ];

  const { tag } = atomsToTagFields(atoms);

  expect(tag.title).toBe("Hello");
  expect(tag.artist).toBe("Tester");
  expect(tag.album).toBe("Album");
  expect(tag.trackNumber).toBe(3);
  expect(tag.trackTotal).toBe(12);
  expect(tag.recordingDate).toBe("2026-01-01");
  expect(tag.year).toBe(2026);
});

it("projects covr atoms onto pictures based on the data type indicator", () => {
  const png = new Uint8Array([1, 2, 3]);
  const atoms: ItunesAtom[] = [
    {
      name: "covr",
      values: [{ typeIndicator: ItunesDataType.Png, locale: 0, data: png }],
    },
  ];

  const { pictures } = atomsToTagFields(atoms);

  expect(pictures).toHaveLength(1);
  expect(pictures[0]?.mimeType).toBe("image/png");
  expect(Array.from(pictures[0]?.data ?? [])).toEqual([1, 2, 3]);
});

it("decodes freeform `----` LYRICIST entries into tag.lyricist", () => {
  const atoms: ItunesAtom[] = [
    {
      name: "----",
      meanNamespace: "com.apple.iTunes",
      meanName: "LYRICIST",
      values: [utf8("Someone")],
    },
  ];

  const { tag } = atomsToTagFields(atoms);

  expect(tag.lyricist).toBe("Someone");
});

it("ignores covr atoms whose type indicator is unknown", () => {
  const atoms: ItunesAtom[] = [
    {
      name: "covr",
      values: [{ typeIndicator: 0, locale: 0, data: new Uint8Array([0xff]) }],
    },
  ];

  const { pictures } = atomsToTagFields(atoms);

  expect(pictures).toHaveLength(0);
});
