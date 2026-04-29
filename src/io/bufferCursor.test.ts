import { describe, expect, it } from "vitest";
import { createBufferCursor } from "./bufferCursor.js";

describe("createBufferCursor", () => {
  it("reports length / position / remaining", () => {
    const cursor = createBufferCursor(new Uint8Array([1, 2, 3, 4]));
    expect(cursor.length).toBe(4);
    expect(cursor.position).toBe(0);
    expect(cursor.remaining).toBe(4);
    cursor.skip(2);
    expect(cursor.position).toBe(2);
    expect(cursor.remaining).toBe(2);
  });

  it("reads multi-byte integers with the correct endianness", () => {
    const cursor = createBufferCursor(
      new Uint8Array([
        0x12, // u8
        0x12,
        0x34, // u16BE
        0x34,
        0x12, // u16LE
        0x12,
        0x34,
        0x56, // u24BE
        0x12,
        0x34,
        0x56,
        0x78, // u32BE
        0x78,
        0x56,
        0x34,
        0x12, // u32LE
      ]),
    );
    expect(cursor.readUInt8()).toBe(0x12);
    expect(cursor.readUInt16BE()).toBe(0x1234);
    expect(cursor.readUInt16LE()).toBe(0x1234);
    expect(cursor.readUInt24BE()).toBe(0x123456);
    expect(cursor.readUInt32BE()).toBe(0x12345678);
    expect(cursor.readUInt32LE()).toBe(0x12345678);
  });

  it("reads syncsafe int32", () => {
    const cursor = createBufferCursor(new Uint8Array([0x00, 0x00, 0x02, 0x01]));
    expect(cursor.readSyncSafeInt32()).toBe((0x02 << 7) | 0x01);
  });

  it("readBytes returns a zero-copy view", () => {
    const source = new Uint8Array([1, 2, 3, 4, 5]);
    const cursor = createBufferCursor(source);
    const view = cursor.readBytes(3);
    expect(view).toEqual(new Uint8Array([1, 2, 3]));
    expect(view.buffer).toBe(source.buffer);
    expect(cursor.position).toBe(3);
  });

  it("readString decodes the requested length", () => {
    const cursor = createBufferCursor(new Uint8Array([0x41, 0x42, 0x43, 0x44]));
    expect(cursor.readString(3, "ascii")).toBe("ABC");
    expect(cursor.position).toBe(3);
  });

  it("readNullTerminated stops at single-byte terminator and consumes it", () => {
    const cursor = createBufferCursor(new Uint8Array([0x41, 0x42, 0x00, 0x43]));
    expect(cursor.readNullTerminated("ascii")).toBe("AB");
    expect(cursor.position).toBe(3);
    expect(cursor.readUInt8()).toBe(0x43);
  });

  it("readNullTerminated handles UTF-16 with two-byte terminator", () => {
    // UTF-16LE "AB" (0x41 0x00 0x42 0x00) + terminator (0x00 0x00) + extra
    const cursor = createBufferCursor(new Uint8Array([0x41, 0x00, 0x42, 0x00, 0x00, 0x00, 0xab]));
    expect(cursor.readNullTerminated("utf16le")).toBe("AB");
    expect(cursor.position).toBe(6);
    expect(cursor.readUInt8()).toBe(0xab);
  });

  it("readNullTerminated returns the rest when no terminator is found", () => {
    const cursor = createBufferCursor(new Uint8Array([0x41, 0x42]));
    expect(cursor.readNullTerminated("ascii")).toBe("AB");
    expect(cursor.position).toBe(2);
  });

  it("seek and peek do not consume bytes", () => {
    const cursor = createBufferCursor(new Uint8Array([1, 2, 3]));
    cursor.seek(1);
    expect(cursor.peek(2)).toEqual(new Uint8Array([2, 3]));
    expect(cursor.position).toBe(1);
  });

  it("throws RangeError on out-of-bounds reads", () => {
    const cursor = createBufferCursor(new Uint8Array([1, 2]));
    expect(() => cursor.readUInt32BE()).toThrow(RangeError);
  });

  it("throws RangeError when seeking past end", () => {
    const cursor = createBufferCursor(new Uint8Array([1, 2]));
    expect(() => cursor.seek(3)).toThrow(RangeError);
    expect(() => cursor.seek(-1)).toThrow(RangeError);
  });

  it("throws RangeError on invalid skip", () => {
    const cursor = createBufferCursor(new Uint8Array([1, 2]));
    expect(() => cursor.skip(5)).toThrow(RangeError);
    expect(() => cursor.skip(-1)).toThrow(RangeError);
  });
});
