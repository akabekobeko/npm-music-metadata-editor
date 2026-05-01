import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { APE_FOOTER_SIZE, APE_MAGIC, ApeItemKind, ApeVersion } from "../constants.js";
import type { ApeItem } from "../types.js";
import { writeApeTag } from "./writeApeTag.js";

const textItem = (key: string, value: string): ApeItem => ({
  key,
  value,
  kind: ApeItemKind.Text,
  readOnly: false,
});

it("emits header + footer for an APE v2 tag", () => {
  const items = [textItem("Title", "Hello")];
  const tag = writeApeTag({ items, version: ApeVersion.V2 });
  expect(tag.subarray(0, 8)).toEqual(APE_MAGIC);
  // Header version + tag size
  const view = Buffer.from(tag.buffer, tag.byteOffset, tag.byteLength);
  expect(view.readUInt32LE(8)).toBe(ApeVersion.V2);
  // Footer at the end
  expect(tag.subarray(tag.length - APE_FOOTER_SIZE, tag.length - APE_FOOTER_SIZE + 8)).toEqual(
    APE_MAGIC,
  );
});

it("omits the header when includeHeader is false", () => {
  const items = [textItem("Title", "no-header")];
  const tag = writeApeTag({ items, version: ApeVersion.V2, includeHeader: false });
  // First 8 bytes are the size of the first item (not APE_MAGIC).
  expect(tag.subarray(0, 8)).not.toEqual(APE_MAGIC);
  // Footer remains at the tail.
  expect(tag.subarray(tag.length - APE_FOOTER_SIZE, tag.length - APE_FOOTER_SIZE + 8)).toEqual(
    APE_MAGIC,
  );
});

it("rejects keys with illegal bytes", () => {
  expect(() => writeApeTag({ items: [textItem("a=b", "x")] })).toThrow(/illegal byte/);
});

it("rejects too-short keys", () => {
  expect(() => writeApeTag({ items: [textItem("a", "x")] })).toThrow(/2..255 characters/);
});

it("encodes binary items as raw bytes", () => {
  const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0a]);
  const item: ApeItem = {
    key: "Cover Art (Front)",
    value: data,
    kind: ApeItemKind.Binary,
    readOnly: false,
  };
  const tag = writeApeTag({ items: [item] });
  // Locate the binary payload in the encoded buffer (it appears verbatim).
  const buf = Buffer.from(tag.buffer, tag.byteOffset, tag.byteLength);
  expect(buf.indexOf(Buffer.from(data))).toBeGreaterThan(0);
});
