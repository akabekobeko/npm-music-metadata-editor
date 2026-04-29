import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { buildCommentFrameBody } from "./buildCommentFrameBody.js";

it("emits the canonical Latin-1 layout with single-byte terminator", () => {
  const bytes = buildCommentFrameBody({
    encoding: "latin1",
    language: "eng",
    description: "",
    text: "hello",
  });
  expect(Array.from(bytes)).toEqual([
    0x00, // encoding byte: latin1
    0x65,
    0x6e,
    0x67, // "eng"
    0x00, // 1-byte terminator (no description)
    0x68,
    0x65,
    0x6c,
    0x6c,
    0x6f, // "hello"
  ]);
});

it("emits the canonical UTF-16 layout with 2-byte terminator and BOM payload", () => {
  const bytes = buildCommentFrameBody({
    encoding: "utf16",
    language: "eng",
    description: "",
    text: "AB",
  });
  expect(bytes[0]).toBe(0x01); // utf16
  expect(Array.from(bytes.subarray(1, 4))).toEqual([0x65, 0x6e, 0x67]); // "eng"
  // encodeText("", "utf16") always emits the 0xFF 0xFE BOM, so an "empty"
  // description occupies two bytes; the 2-byte terminator follows; then the
  // BOM-prefixed UTF-16LE text. parseCommentFrame consumes the leading BOM
  // transparently on the read side.
  expect(Array.from(bytes.subarray(4, 6))).toEqual([0xff, 0xfe]);
  expect(Array.from(bytes.subarray(6, 8))).toEqual([0x00, 0x00]);
  expect(Array.from(bytes.subarray(8))).toEqual([0xff, 0xfe, 0x41, 0x00, 0x42, 0x00]);
});

it("includes the description bytes between language and terminator", () => {
  const bytes = buildCommentFrameBody({
    encoding: "latin1",
    language: "eng",
    description: "id",
    text: "x",
  });
  // 0x00 enc + "eng" + "id" + 0x00 term + "x"
  expect(Array.from(bytes)).toEqual([0x00, 0x65, 0x6e, 0x67, 0x69, 0x64, 0x00, 0x78]);
});

it("pads short language codes to exactly 3 bytes", () => {
  const bytes = buildCommentFrameBody({
    encoding: "latin1",
    language: "x",
    description: "",
    text: "",
  });
  expect(Array.from(bytes.subarray(1, 4))).toEqual([
    0x78,
    0x20,
    0x20, // 'x' followed by two ASCII spaces
  ]);
});

it("throws on an unsupported encoding", () => {
  expect(() =>
    buildCommentFrameBody({
      // @ts-expect-error testing the runtime guard
      encoding: "shift_jis",
      language: "jpn",
      description: "",
      text: "",
    }),
  ).toThrow(/unsupported encoding/);
});

it("places the trailing text after the description terminator unchanged", () => {
  const bytes = buildCommentFrameBody({
    encoding: "utf8",
    language: "eng",
    description: "",
    text: "音楽",
  });
  // After encoding(1) + lang(3) + 1-byte terminator, the rest should be UTF-8 of "音楽".
  const text = Buffer.from(bytes.subarray(5)).toString("utf8");
  expect(text).toBe("音楽");
});
