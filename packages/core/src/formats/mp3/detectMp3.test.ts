import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { detectMp3Signature } from "./detectMp3.js";

// A valid MPEG 1 Layer III header: sync + version 1 + Layer III + 128 kbps +
// 44.1 kHz + stereo.
const MPEG_FRAME_HEADER = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);

/**
 * Build the first 64 bytes of an M4A file whose `mvhd` creation-time field
 * contains bytes that decode as an MPEG audio sync (`FF FC ...`). Mirrors a
 * real-world iTunes-encoded file that used to be misdetected as MP3.
 */
const buildM4aHeaderWithSyncLikeTimestamp = (): Uint8Array => {
  const out = Buffer.alloc(64);
  // ftyp box (32 bytes): brand M4A , compatible brands M4A / mp42 / isom.
  out.writeUInt32BE(32, 0);
  out.write("ftypM4A \0\0\0\0M4A mp42isom\0\0\0\0", 4, "latin1");
  // moov container followed by mvhd.
  out.writeUInt32BE(0x000b8194, 32);
  out.write("moov", 36, "latin1");
  out.writeUInt32BE(0x6c, 40);
  out.write("mvhd", 44, "latin1");
  out.writeUInt32BE(0, 48); // version + flags
  out.writeUInt32BE(0xfffc64d1, 52); // creation time — looks like an MPEG sync
  out.writeUInt32BE(0xd6cb060e, 56); // modification time
  out.writeUInt32BE(0x0000ac44, 60); // timescale
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

it("returns true for a leading ID3v2 magic", () => {
  expect(detectMp3Signature(new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]))).toBe(true);
});

it("returns true for an MPEG audio sync at offset 0", () => {
  expect(detectMp3Signature(MPEG_FRAME_HEADER)).toBe(true);
});

it("returns false when the sync appears after offset 0", () => {
  const shifted = new Uint8Array(8);
  shifted.set(MPEG_FRAME_HEADER, 4);
  expect(detectMp3Signature(shifted)).toBe(false);
});

it("returns false for an M4A header with sync-like mvhd timestamp bytes", () => {
  expect(detectMp3Signature(buildM4aHeaderWithSyncLikeTimestamp())).toBe(false);
});

it("returns false for empty or short input", () => {
  expect(detectMp3Signature(new Uint8Array())).toBe(false);
  expect(detectMp3Signature(new Uint8Array([0xff, 0xfb]))).toBe(false);
});
