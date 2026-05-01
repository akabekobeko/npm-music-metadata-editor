import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { encodeGuid } from "./asf/guid.js";
import { ASF_GUID } from "./constants.js";
import { detectWmaSignature } from "./detectWma.js";

it("matches a Header Object GUID prefix", () => {
  const buf = Buffer.alloc(64);
  buf.set(encodeGuid(ASF_GUID.HeaderObject));
  expect(detectWmaSignature(buf)).toBe(true);
});

it("rejects buffers that are too short", () => {
  expect(detectWmaSignature(new Uint8Array(15))).toBe(false);
});

it("rejects unrelated GUIDs", () => {
  expect(detectWmaSignature(encodeGuid(ASF_GUID.DataObject))).toBe(false);
});
