import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { detectFormatBySignature } from "./formats/detect.js";
import * as mme from "./mme.js";

it("re-exports the high-level API", () => {
  expect(typeof mme.loadTrack).toBe("function");
  expect(typeof mme.saveTrack).toBe("function");
  expect(typeof mme.readMetadata).toBe("function");
  expect(typeof mme.writeMetadata).toBe("function");
  expect(typeof mme.createMmeError).toBe("function");
  expect(typeof mme.isMmeError).toBe("function");
});

it("re-exports PictureKind constants", () => {
  expect(mme.PictureKind.CoverFront).toBe(3);
  expect(mme.PictureKind.Other).toBe(0);
});

it("detects M4A as mp4 even when mvhd timestamp bytes look like an MPEG sync", () => {
  // Regression: with all built-in formats registered, an M4A whose `mvhd`
  // creation time contains `FF FC ...` within the 64-byte probe used to be
  // claimed by the MP3 sync-scan heuristic.
  const header = Buffer.alloc(64);
  header.writeUInt32BE(32, 0);
  header.write("ftypM4A \0\0\0\0M4A mp42isom\0\0\0\0", 4, "latin1");
  header.writeUInt32BE(0x000b8194, 32);
  header.write("moov", 36, "latin1");
  header.writeUInt32BE(0x6c, 40);
  header.write("mvhd", 44, "latin1");
  header.writeUInt32BE(0, 48);
  header.writeUInt32BE(0xfffc64d1, 52); // creation time — decodes as MPEG sync
  header.writeUInt32BE(0xd6cb060e, 56);
  header.writeUInt32BE(0x0000ac44, 60);
  expect(detectFormatBySignature(new Uint8Array(header))).toBe("mp4");
});
