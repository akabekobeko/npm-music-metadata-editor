import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { ASF_GUID, ASF_HEADER_OBJECT_PREAMBLE_SIZE, ASF_OBJECT_HEADER_SIZE } from "../constants.js";
import { encodeGuid } from "./guid.js";
import { parseAsfTree } from "./parseAsfTree.js";

/** Build a minimal child object with a given GUID and payload. */
const child = (guid: string, payload: Uint8Array): Uint8Array => {
  const totalSize = ASF_OBJECT_HEADER_SIZE + payload.length;
  const out = Buffer.alloc(totalSize);
  out.set(encodeGuid(guid), 0);
  out.writeBigUInt64LE(BigInt(totalSize), 16);
  out.set(payload, ASF_OBJECT_HEADER_SIZE);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Build a Header Object wrapping `children`. */
const header = (children: readonly Uint8Array[]): Uint8Array => {
  const childBytes = Buffer.concat(children.map((c) => Buffer.from(c)));
  const totalSize = ASF_HEADER_OBJECT_PREAMBLE_SIZE + childBytes.length;
  const out = Buffer.alloc(totalSize);
  out.set(encodeGuid(ASF_GUID.HeaderObject), 0);
  out.writeBigUInt64LE(BigInt(totalSize), 16);
  out.writeUInt32LE(children.length, 24);
  // Reserved fields at offsets 28 / 29 stay zero in our fixture.
  out.set(childBytes, ASF_HEADER_OBJECT_PREAMBLE_SIZE);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

it("parses Header Object children and the trailing Data Object", () => {
  const fileProps = child(ASF_GUID.FilePropertiesObject, new Uint8Array(80));
  const contentDesc = child(ASF_GUID.ContentDescriptionObject, new Uint8Array(10));
  const data = child(ASF_GUID.DataObject, new Uint8Array(16));
  const buffer = Buffer.concat([Buffer.from(header([fileProps, contentDesc])), Buffer.from(data)]);

  const tree = parseAsfTree(new Uint8Array(buffer));
  expect(tree).toHaveLength(2);
  expect(tree[0]?.guid).toBe(ASF_GUID.HeaderObject);
  expect(tree[0]?.children?.map((c) => c.guid)).toEqual([
    ASF_GUID.FilePropertiesObject,
    ASF_GUID.ContentDescriptionObject,
  ]);
  expect(tree[1]?.guid).toBe(ASF_GUID.DataObject);
});

it("stops gracefully when an object claims more bytes than remain", () => {
  const head = header([]);
  // Append a truncated object: only the first byte of a 16-byte GUID.
  const truncated = Buffer.concat([Buffer.from(head), Buffer.from([0xff])]);
  const tree = parseAsfTree(new Uint8Array(truncated));
  expect(tree).toHaveLength(1);
  expect(tree[0]?.guid).toBe(ASF_GUID.HeaderObject);
});

it("does not recurse past the Header Object level", () => {
  const fileProps = child(ASF_GUID.FilePropertiesObject, new Uint8Array(40));
  const buffer = header([fileProps]);
  const tree = parseAsfTree(buffer);
  expect(tree[0]?.children?.[0]?.children).toBeUndefined();
});
