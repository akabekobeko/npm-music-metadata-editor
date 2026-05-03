import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { readVorbisComment } from "./readVorbisComment.js";
import { writeVorbisComment } from "./writeVorbisComment.js";

const buildBlock = (vendor: string, entries: readonly string[]): Uint8Array => {
  const vendorBytes = Buffer.from(vendor, "utf8");
  const entryBuffers = entries.map((entry) => {
    const data = Buffer.from(entry, "utf8");
    const out = Buffer.alloc(4 + data.length);
    out.writeUInt32LE(data.length, 0);
    data.copy(out, 4);
    return out;
  });
  const vendorBlock = Buffer.alloc(4 + vendorBytes.length);
  vendorBlock.writeUInt32LE(vendorBytes.length, 0);
  vendorBytes.copy(vendorBlock, 4);
  const countBlock = Buffer.alloc(4);
  countBlock.writeUInt32LE(entries.length, 0);
  return Buffer.concat([vendorBlock, countBlock, ...entryBuffers]);
};

it("reads vendor and a single comment", () => {
  const block = buildBlock("reference libFLAC 1.4.0", ["TITLE=Hello"]);
  const result = readVorbisComment(block);
  expect(result.vendor).toBe("reference libFLAC 1.4.0");
  expect(result.comments).toEqual([{ key: "TITLE", value: "Hello" }]);
});

it("reads an empty vendor and zero comments", () => {
  const block = buildBlock("", []);
  const result = readVorbisComment(block);
  expect(result.vendor).toBe("");
  expect(result.comments).toEqual([]);
});

it("decodes UTF-8 multi-byte values", () => {
  const block = buildBlock("vendor", ["ARTIST=日本語アーティスト"]);
  const result = readVorbisComment(block);
  expect(result.comments[0]).toEqual({ key: "ARTIST", value: "日本語アーティスト" });
});

it("preserves repeated keys in encounter order (multi-value)", () => {
  const block = buildBlock("v", ["ARTIST=A", "ARTIST=B", "ARTIST=C"]);
  const result = readVorbisComment(block);
  expect(result.comments).toEqual([
    { key: "ARTIST", value: "A" },
    { key: "ARTIST", value: "B" },
    { key: "ARTIST", value: "C" },
  ]);
});

it("treats the first '=' as the separator and keeps later '=' in the value", () => {
  const block = buildBlock("v", ["URL=https://example.com/?x=1&y=2"]);
  const result = readVorbisComment(block);
  expect(result.comments[0]).toEqual({
    key: "URL",
    value: "https://example.com/?x=1&y=2",
  });
});

it("silently drops malformed entries (no '=' or empty key)", () => {
  const block = buildBlock("v", ["NOEQUALS", "=novalue", "VALID=ok"]);
  const result = readVorbisComment(block);
  expect(result.comments).toEqual([{ key: "VALID", value: "ok" }]);
});

it("preserves an entry with an empty value", () => {
  const block = buildBlock("v", ["EMPTY="]);
  const result = readVorbisComment(block);
  expect(result.comments).toEqual([{ key: "EMPTY", value: "" }]);
});

it("round-trips through writeVorbisComment", () => {
  const original = {
    vendor: "test 1.0",
    comments: [
      { key: "TITLE", value: "曲名" },
      { key: "ARTIST", value: "Alice" },
      { key: "ARTIST", value: "Bob" },
      { key: "URL", value: "https://example.com/?x=1" },
    ],
  };
  const encoded = writeVorbisComment(original);
  const decoded = readVorbisComment(encoded);
  expect(decoded).toEqual(original);
});

it("throws on truncated comment-count region", () => {
  // Header says 4 bytes for vendor length, then 0 bytes of vendor, then we're
  // missing the 4-byte comment count entirely.
  const truncated = Buffer.alloc(4); // only the vendor length prefix (=0)
  truncated.writeUInt32LE(0, 0);
  expect(() => readVorbisComment(truncated)).toThrow(/comment count/);
});

it("throws when a comment's length extends past the buffer", () => {
  const vendorBlock = Buffer.alloc(4);
  vendorBlock.writeUInt32LE(0, 0);
  const countBlock = Buffer.alloc(4);
  countBlock.writeUInt32LE(1, 0);
  const lengthPrefix = Buffer.alloc(4);
  lengthPrefix.writeUInt32LE(99, 0); // claim 99 bytes of payload
  const truncated = Buffer.concat([vendorBlock, countBlock, lengthPrefix]);
  expect(() => readVorbisComment(truncated)).toThrow(/extends past/);
});
