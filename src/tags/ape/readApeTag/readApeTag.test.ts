import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { ApeItemKind, ApeVersion } from "../constants.js";
import type { ApeItem } from "../types.js";
import { writeApeTag } from "../writeApeTag/writeApeTag.js";
import { readApeTag } from "./readApeTag.js";

const textItem = (key: string, value: string): ApeItem => ({
  key,
  value,
  kind: ApeItemKind.Text,
  readOnly: false,
});

it("returns undefined when the buffer has no APE footer", () => {
  expect(readApeTag(new Uint8Array(64))).toBeUndefined();
});

it("returns undefined when the buffer is shorter than the footer", () => {
  expect(readApeTag(new Uint8Array(16))).toBeUndefined();
});

it("parses an APE v2 tag with header", () => {
  const items: ApeItem[] = [
    textItem("Title", "APE v2"),
    textItem("Artist", "Tester"),
    textItem("Track", "3/9"),
  ];
  const tag = writeApeTag({ items, version: ApeVersion.V2 });
  const parsed = readApeTag(tag);
  expect(parsed?.version).toBe(ApeVersion.V2);
  expect(parsed?.hasHeader).toBe(true);
  expect(parsed?.items).toEqual(items);
  expect(parsed?.totalSize).toBe(tag.length);
});

it("parses an APE v1 tag (no header)", () => {
  const items: ApeItem[] = [textItem("Title", "v1"), textItem("Artist", "old")];
  const tag = writeApeTag({ items, version: ApeVersion.V1, includeHeader: false });
  const parsed = readApeTag(tag);
  expect(parsed?.version).toBe(ApeVersion.V1);
  expect(parsed?.hasHeader).toBe(false);
  expect(parsed?.items).toEqual(items);
});

it("preserves binary item bytes verbatim", () => {
  const cover: ApeItem = {
    key: "Cover Art (Front)",
    value: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xde, 0xad, 0xbe, 0xef]),
    kind: ApeItemKind.Binary,
    readOnly: false,
  };
  const tag = writeApeTag({ items: [textItem("Title", "Cover"), cover] });
  const parsed = readApeTag(tag);
  expect(parsed?.items[1]?.kind).toBe(ApeItemKind.Binary);
  expect(parsed?.items[1]?.value).toEqual(cover.value);
});

it("ignores trailing ID3v1 when locating the APE footer", () => {
  const items = [textItem("Title", "Layered"), textItem("Year", "2024")];
  const tag = writeApeTag({ items });
  const id3v1 = Buffer.alloc(128);
  id3v1.set([0x54, 0x41, 0x47], 0); // "TAG"
  const layered = Buffer.concat([tag, id3v1]);
  const parsed = readApeTag(layered);
  expect(parsed?.items).toEqual(items);
});

it("round-trips read-only items", () => {
  const item: ApeItem = {
    key: "Title",
    value: "Locked",
    kind: ApeItemKind.Text,
    readOnly: true,
  };
  const tag = writeApeTag({ items: [item] });
  const parsed = readApeTag(tag);
  expect(parsed?.items[0]?.readOnly).toBe(true);
});
