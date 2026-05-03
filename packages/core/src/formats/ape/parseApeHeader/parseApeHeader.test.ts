import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import {
  APE_COMMON_HEADER_SIZE,
  APE_DESCRIPTOR_SIZE,
  APE_FILE_MAGIC,
  APE_NEW_HEADER_SIZE,
  APE_OLD_HEADER_SIZE,
} from "../constants.js";
import { parseApeHeader } from "./parseApeHeader.js";

const buildNewHeader = (): Uint8Array => {
  const out = Buffer.alloc(APE_COMMON_HEADER_SIZE + APE_DESCRIPTOR_SIZE + APE_NEW_HEADER_SIZE);
  out.set(APE_FILE_MAGIC, 0);
  out.writeUInt16LE(3990, APE_FILE_MAGIC.length);
  // Descriptor (only the size fields matter for parsing).
  out.writeUInt16LE(0, APE_COMMON_HEADER_SIZE); // padded
  out.writeUInt32LE(APE_DESCRIPTOR_SIZE, APE_COMMON_HEADER_SIZE + 2);
  out.writeUInt32LE(APE_NEW_HEADER_SIZE, APE_COMMON_HEADER_SIZE + 6);
  // New header at offset = common + descriptor.
  const newAt = APE_COMMON_HEADER_SIZE + APE_DESCRIPTOR_SIZE;
  out.writeUInt16LE(2000, newAt); // compression level
  out.writeUInt16LE(0, newAt + 2); // format flags
  out.writeUInt32LE(73728, newAt + 4); // blocks per frame
  out.writeUInt32LE(73728, newAt + 8); // final frame blocks
  out.writeUInt32LE(2, newAt + 12); // total frames
  out.writeUInt16LE(16, newAt + 16); // bits per sample
  out.writeUInt16LE(2, newAt + 18); // channels
  out.writeUInt32LE(44100, newAt + 20); // sample rate
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

const buildOldHeader = (): Uint8Array => {
  const out = Buffer.alloc(APE_COMMON_HEADER_SIZE + APE_OLD_HEADER_SIZE);
  out.set(APE_FILE_MAGIC, 0);
  out.writeUInt16LE(3970, APE_FILE_MAGIC.length); // 3.97
  // Old header layout follows immediately.
  out.writeUInt16LE(2000, APE_COMMON_HEADER_SIZE); // compression level
  out.writeUInt16LE(0, APE_COMMON_HEADER_SIZE + 2); // format flags
  out.writeUInt16LE(2, APE_COMMON_HEADER_SIZE + 4); // channels
  out.writeUInt32LE(48000, APE_COMMON_HEADER_SIZE + 6); // sample rate
  // skip header / terminating bytes (8 bytes total)
  out.writeUInt32LE(2, APE_COMMON_HEADER_SIZE + 18); // total frames
  out.writeUInt32LE(73728, APE_COMMON_HEADER_SIZE + 22); // final frame blocks
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

it("parses the modern header (>= 3.98)", () => {
  const info = parseApeHeader(buildNewHeader());
  expect(info?.version).toBe(3990);
  expect(info?.sampleRate).toBe(44100);
  expect(info?.channels).toBe(2);
  expect(info?.bitsPerSample).toBe(16);
  expect(info?.totalSamples).toBe(73728 * (2 - 1) + 73728);
});

it("parses the legacy header (<= 3.97)", () => {
  const info = parseApeHeader(buildOldHeader());
  expect(info?.version).toBe(3970);
  expect(info?.sampleRate).toBe(48000);
  expect(info?.channels).toBe(2);
  expect(info?.bitsPerSample).toBe(16);
  expect(info?.totalSamples).toBe((2 - 1) * 73728 * 4 + 73728);
});

it("returns undefined when the magic does not match", () => {
  const out = new Uint8Array(64);
  out[0] = 0x00;
  expect(parseApeHeader(out)).toBeUndefined();
});
