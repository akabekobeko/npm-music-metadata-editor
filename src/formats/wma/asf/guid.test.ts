import { describe, expect, it } from "vitest";
import { ASF_GUID } from "../constants.js";
import { decodeGuid, encodeGuid } from "./guid.js";

describe("decodeGuid", () => {
  it("decodes the Header Object signature into its canonical form", () => {
    const headerBytes = new Uint8Array([
      0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce,
      0x6c,
    ]);
    expect(decodeGuid(headerBytes)).toBe(ASF_GUID.HeaderObject);
  });

  it("ignores trailing bytes past the 16-byte GUID", () => {
    const padded = new Uint8Array(20);
    padded.set(encodeGuid(ASF_GUID.ContentDescriptionObject));
    expect(decodeGuid(padded)).toBe(ASF_GUID.ContentDescriptionObject);
  });

  it("throws when the input is too short", () => {
    expect(() => decodeGuid(new Uint8Array(15))).toThrow(RangeError);
  });
});

describe("encodeGuid", () => {
  it("round-trips every spec GUID through decode -> encode -> decode", () => {
    for (const guid of Object.values(ASF_GUID)) {
      expect(decodeGuid(encodeGuid(guid))).toBe(guid);
    }
  });

  it("accepts lowercase input", () => {
    const upper = encodeGuid(ASF_GUID.HeaderObject);
    const lower = encodeGuid(ASF_GUID.HeaderObject.toLowerCase());
    expect(lower).toEqual(upper);
  });

  it("throws when the literal is malformed", () => {
    expect(() => encodeGuid("not-a-guid")).toThrow(RangeError);
    expect(() => encodeGuid("ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ")).toThrow(RangeError);
  });
});
