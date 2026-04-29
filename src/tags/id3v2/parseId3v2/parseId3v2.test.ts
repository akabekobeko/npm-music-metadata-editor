import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { applyUnsynchronization } from "../applyUnsynchronization.js";
import { buildId3v2 } from "../buildId3v2/buildId3v2.js";
import { id3v2TagToTagData } from "../id3v2TagToTagData/id3v2TagToTagData.js";
import { parseId3v2 } from "./parseId3v2.js";

const FRAME_FLAGS = {
  tagAlterPreservation: false,
  fileAlterPreservation: false,
  readOnly: false,
  groupingIdentity: false,
  compression: false,
  encryption: false,
  unsynchronization: false,
  dataLengthIndicator: false,
};

it("returns undefined for buffers without the ID3 magic", () => {
  expect(parseId3v2(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeUndefined();
});

it("decodes a tag-level unsynchronised body", () => {
  // Construct an ID3v2.3 tag whose body contains 0xFF 0xE0 (a sync candidate);
  // applyUnsynchronization escapes it to 0xFF 0x00 0xE0 and we set the flag.
  const innerBody = buildId3v2({
    majorVersion: 3,
    frames: [
      {
        id: "TIT2",
        flags: FRAME_FLAGS,
        data: new Uint8Array([0x00, 0x41, 0xff, 0xe0, 0x42]), // "A\xFF\xE0B" (Latin-1)
      },
    ],
  });
  // Replace the header to set the unsync flag and re-encode the body.
  const body = innerBody.subarray(10);
  const escaped = applyUnsynchronization(body);
  const out = Buffer.alloc(10 + escaped.length);
  out.set(innerBody.subarray(0, 10), 0);
  out[5] = 0x80; // unsync flag
  // Rewrite syncsafe size to the new length.
  const size = escaped.length;
  out[6] = (size >>> 21) & 0x7f;
  out[7] = (size >>> 14) & 0x7f;
  out[8] = (size >>> 7) & 0x7f;
  out[9] = size & 0x7f;
  out.set(escaped, 10);

  const tag = parseId3v2(out);
  expect(tag).toBeDefined();
  expect(tag?.flags.unsynchronization).toBe(true);
  expect(tag?.frames[0]?.id).toBe("TIT2");
  expect(Array.from(tag?.frames[0]?.data ?? [])).toEqual([0x00, 0x41, 0xff, 0xe0, 0x42]);
});

it("promotes ID3v2.2 frame IDs to their v2.3 equivalents", () => {
  // Hand-build a tiny v2.2 tag: header + one TT2 (title) frame.
  const titleBytes = new Uint8Array([0x00, ...Buffer.from("v22Title", "latin1")]);
  const frame = Buffer.alloc(6 + titleBytes.length);
  frame.write("TT2", 0, 3, "latin1");
  frame[3] = 0;
  frame[4] = 0;
  frame[5] = titleBytes.length;
  frame.set(titleBytes, 6);

  const out = Buffer.alloc(10 + frame.length);
  out.write("ID3", 0, 3, "latin1");
  out[3] = 2; // v2.2
  out[4] = 0;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = frame.length;
  out.set(frame, 10);

  const tag = parseId3v2(out);
  expect(tag?.majorVersion).toBe(2);
  expect(tag?.frames[0]?.id).toBe("TIT2");
  if (tag === undefined) throw new Error("tag should be defined");
  const data = id3v2TagToTagData(tag);
  expect(data.title).toBe("v22Title");
});
