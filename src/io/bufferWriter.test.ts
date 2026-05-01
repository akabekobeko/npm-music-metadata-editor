import { expect, it } from "vitest";
import { createBufferCursor } from "./bufferCursor.js";
import { createBufferWriter } from "./bufferWriter.js";

it("starts empty", () => {
  const writer = createBufferWriter();
  expect(writer.length).toBe(0);
  expect(writer.concat().length).toBe(0);
});

it("appends bytes and tracks length", () => {
  const writer = createBufferWriter();
  writer.writeUInt8(0x12);
  writer.writeUInt16BE(0x3456);
  expect(writer.length).toBe(3);
  expect(Array.from(writer.concat())).toEqual([0x12, 0x34, 0x56]);
});

it("grows past the initial capacity", () => {
  const writer = createBufferWriter();
  const payload = new Uint8Array(2048).fill(0xab);
  writer.writeBytes(payload);
  expect(writer.length).toBe(2048);
  expect(writer.concat().length).toBe(2048);
  expect(writer.concat()[2047]).toBe(0xab);
});

it("writes a null-terminated UTF-16LE string with 2-byte terminator", () => {
  const writer = createBufferWriter();
  const written = writer.writeNullTerminated("AB", "utf16le");
  expect(written).toBe(6); // 2 chars * 2 bytes + 2-byte terminator
  expect(Array.from(writer.concat())).toEqual([0x41, 0x00, 0x42, 0x00, 0x00, 0x00]);
});

it("round-trips a mixed stream of writes through a cursor", () => {
  const writer = createBufferWriter();
  writer.writeUInt8(0xff);
  writer.writeUInt16BE(0x1234);
  writer.writeUInt16LE(0x5678);
  writer.writeUInt24BE(0xabcdef);
  writer.writeUInt32BE(0xdeadbeef);
  writer.writeUInt32LE(0xcafebabe);
  writer.writeSyncSafeInt32(0x0fffffff);
  writer.writeNullTerminated("hello", "ascii");
  writer.writeNullTerminated("音", "utf16le");

  const cursor = createBufferCursor(writer.concat());
  expect(cursor.readUInt8()).toBe(0xff);
  expect(cursor.readUInt16BE()).toBe(0x1234);
  expect(cursor.readUInt16LE()).toBe(0x5678);
  expect(cursor.readUInt24BE()).toBe(0xabcdef);
  expect(cursor.readUInt32BE()).toBe(0xdeadbeef);
  expect(cursor.readUInt32LE()).toBe(0xcafebabe);
  expect(cursor.readSyncSafeInt32()).toBe(0x0fffffff);
  expect(cursor.readNullTerminated("ascii")).toBe("hello");
  expect(cursor.readNullTerminated("utf16le")).toBe("音");
  expect(cursor.remaining).toBe(0);
});
