import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { buildId3v2 } from "./buildId3v2/buildId3v2.js";
import { buildTextFrameBody } from "./buildId3v2/buildTextFrameBody.js";
import { id3v2TagToTagData, readId3v2 } from "./readId3v2.js";
import { applyUnsynchronization } from "./unsynchronization.js";
import { writeId3v2 } from "./writeId3v2.js";

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

describe("ID3v2 round-trip", () => {
  it.each([3, 4] as const)("writes and reads back v2.%d text fields", (majorVersion) => {
    const bytes = writeId3v2({
      majorVersion,
      tag: {
        title: "Title",
        artist: "Artist",
        album: "Album",
        year: 2024,
        trackNumber: 3,
        trackTotal: 11,
        discNumber: 1,
        discTotal: 2,
        comment: "A comment",
        genre: "Rock",
      },
    });
    const tag = readId3v2(bytes);
    expect(tag).toBeDefined();
    expect(tag?.majorVersion).toBe(majorVersion);
    if (tag === undefined) throw new Error("tag should be defined");
    const data = id3v2TagToTagData(tag);
    expect(data).toEqual({
      title: "Title",
      artist: "Artist",
      album: "Album",
      year: 2024,
      trackNumber: 3,
      trackTotal: 11,
      discNumber: 1,
      discTotal: 2,
      comment: "A comment",
      genre: "Rock",
    });
  });

  it("preserves unknown frames passed via preserveFrames", () => {
    const unknown = {
      id: "TENC",
      flags: FRAME_FLAGS,
      data: buildTextFrameBody({ encoding: "utf8", text: "MMETest/1.0" }),
    };
    const bytes = writeId3v2({
      majorVersion: 4,
      tag: { title: "Hi" },
      preserveFrames: [unknown],
    });
    const tag = readId3v2(bytes);
    const ids = tag?.frames.map((f) => f.id);
    expect(ids).toEqual(["TIT2", "TENC"]);
  });

  it("includes padding when requested", () => {
    const bytes = writeId3v2({
      majorVersion: 4,
      tag: { title: "Title" },
      padding: 64,
    });
    const tag = readId3v2(bytes);
    expect(tag).toBeDefined();
    // Header (10) + TIT2 frame ((10+1+5)=16) + 64 padding = 90 bytes
    expect(tag?.totalSize).toBe(bytes.length);
  });

  it("rejects buffers without the ID3 magic", () => {
    expect(readId3v2(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeUndefined();
  });
});

describe("ID3v2 unsynchronisation", () => {
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

    const tag = readId3v2(out);
    expect(tag).toBeDefined();
    expect(tag?.flags.unsynchronization).toBe(true);
    expect(tag?.frames[0]?.id).toBe("TIT2");
    // The decoded body should match the original (un-escaped) bytes.
    expect(Array.from(tag?.frames[0]?.data ?? [])).toEqual([0x00, 0x41, 0xff, 0xe0, 0x42]);
  });
});

describe("ID3v2.2 read", () => {
  it("promotes v2.2 frame IDs to their v2.3 equivalents", () => {
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

    const tag = readId3v2(out);
    expect(tag?.majorVersion).toBe(2);
    expect(tag?.frames[0]?.id).toBe("TIT2");
    if (tag === undefined) throw new Error("tag should be defined");
    const data = id3v2TagToTagData(tag);
    expect(data.title).toBe("v22Title");
  });
});
