import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { writeVorbisComment } from "../../../tags/vorbisComment/writeVorbisComment.js";
import { buildMetadataBlock } from "../buildFlac/buildMetadataBlock.js";
import { FLAC_SIGNATURE, FLAC_STREAMINFO_SIZE, FlacBlockType } from "../constants.js";
import { parseFlac } from "./parseFlac.js";

const buildStreamInfoBody = (): Uint8Array => {
  const out = Buffer.alloc(FLAC_STREAMINFO_SIZE);
  out.writeUInt16BE(4096, 0);
  out.writeUInt16BE(4096, 2);
  // sampleRate = 48000, channels = 2, bps = 24, totalSamples = 96000 (2 sec)
  out[10] = (48000 >>> 12) & 0xff;
  out[11] = (48000 >>> 4) & 0xff;
  out[12] = ((48000 & 0x0f) << 4) | ((2 - 1) << 1) | (((24 - 1) >> 4) & 0x01);
  out[13] = ((24 - 1) & 0x0f) << 4;
  out.writeUInt32BE(96000, 14);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

const assemble = (blocks: { type: number; data: Uint8Array }[], audio: Uint8Array): Uint8Array => {
  const blockBuffers = blocks.map((block, index) =>
    buildMetadataBlock({
      type: block.type,
      data: block.data,
      isLast: index === blocks.length - 1,
    }),
  );
  return new Uint8Array(Buffer.concat([FLAC_SIGNATURE, ...blockBuffers, audio]));
};

it("decodes STREAMINFO sample rate / channels / bits / total samples / duration", () => {
  const bytes = assemble(
    [{ type: FlacBlockType.StreamInfo, data: buildStreamInfoBody() }],
    new Uint8Array([0x00]),
  );
  const parsed = parseFlac(bytes);
  expect(parsed.streamInfo.sampleRate).toBe(48000);
  expect(parsed.streamInfo.channels).toBe(2);
  expect(parsed.streamInfo.bitsPerSample).toBe(24);
  expect(parsed.streamInfo.totalSamples).toBe(96000);
  expect(parsed.streamInfo.durationMs).toBe(2000);
});

it("decodes a Vorbis Comment block embedded after STREAMINFO", () => {
  const vorbis = writeVorbisComment({
    vendor: "test",
    comments: [{ key: "TITLE", value: "Hello" }],
  });
  const bytes = assemble(
    [
      { type: FlacBlockType.StreamInfo, data: buildStreamInfoBody() },
      { type: FlacBlockType.VorbisComment, data: vorbis },
    ],
    new Uint8Array([0x00]),
  );
  const parsed = parseFlac(bytes);
  expect(parsed.vorbisComment?.vendor).toBe("test");
  expect(parsed.vorbisComment?.comments).toEqual([{ key: "TITLE", value: "Hello" }]);
});

it("preserves unknown / pass-through blocks verbatim", () => {
  const application = Buffer.from("APPLDATA", "utf8");
  const bytes = assemble(
    [
      { type: FlacBlockType.StreamInfo, data: buildStreamInfoBody() },
      { type: FlacBlockType.Application, data: new Uint8Array(application) },
    ],
    new Uint8Array([0x00]),
  );
  const parsed = parseFlac(bytes);
  // STREAMINFO + APPLICATION come back through `passThroughBlocks`.
  expect(parsed.passThroughBlocks).toHaveLength(2);
  const appBlock = parsed.passThroughBlocks[1];
  expect(appBlock?.type).toBe(FlacBlockType.Application);
  expect(appBlock === undefined ? "" : Buffer.from(appBlock.data).toString("utf8")).toBe(
    "APPLDATA",
  );
});

it("drops PADDING blocks (the writer rebuilds them)", () => {
  const bytes = assemble(
    [
      { type: FlacBlockType.StreamInfo, data: buildStreamInfoBody() },
      { type: FlacBlockType.Padding, data: new Uint8Array(16) },
    ],
    new Uint8Array([0x00]),
  );
  const parsed = parseFlac(bytes);
  expect(parsed.passThroughBlocks.find((b) => b.type === FlacBlockType.Padding)).toBeUndefined();
  // Audio offset still sits past the padding block.
  expect(parsed.audioOffset).toBe(bytes.length - 1);
});

it("throws when the fLaC signature is missing", () => {
  expect(() => parseFlac(new Uint8Array([0x66, 0x4c, 0x61, 0x44]))).toThrow(/fLaC/);
});

it("throws when STREAMINFO is absent", () => {
  // Build a file with only a PADDING block — STREAMINFO should always be the first block.
  const bytes = assemble(
    [{ type: FlacBlockType.Padding, data: new Uint8Array(8) }],
    new Uint8Array([0x00]),
  );
  expect(() => parseFlac(bytes)).toThrow(/STREAMINFO/);
});
