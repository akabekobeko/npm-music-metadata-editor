import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { parseChunks } from "./parseChunks.js";

/** Args for {@link makeChunk}. */
type MakeChunkArgs = {
  /** 4-character chunk identifier. */
  id: string;
  /** Chunk payload bytes (size field is derived from this). */
  payload: Uint8Array;
  /** Byte order used to encode the size field. */
  endianness: "little" | "big";
};

/** Build a chunk header + payload, padded to an even length. */
const makeChunk = ({ id, payload, endianness }: MakeChunkArgs): Buffer => {
  const padding = payload.length % 2;
  const out = Buffer.alloc(8 + payload.length + padding);
  out.write(id, 0, 4, "latin1");
  if (endianness === "little") {
    out.writeUInt32LE(payload.length, 4);
  } else {
    out.writeUInt32BE(payload.length, 4);
  }

  out.set(payload, 8);
  return out;
};

describe("little-endian (RIFF) chunks", () => {
  it("returns each chunk with offsets pointing into the source buffer", () => {
    const a = makeChunk({
      id: "AAAA",
      payload: new Uint8Array([1, 2, 3, 4]),
      endianness: "little",
    });
    const b = makeChunk({ id: "BBBB", payload: new Uint8Array([9]), endianness: "little" }); // odd payload → 1 pad byte
    const c = makeChunk({ id: "CCCC", payload: new Uint8Array(), endianness: "little" });
    const buffer = Buffer.concat([a, b, c]);

    const chunks = parseChunks({ buffer, endianness: "little" });

    expect(chunks).toEqual([
      { id: "AAAA", offset: 0, size: 12, payloadOffset: 8, payloadSize: 4 },
      { id: "BBBB", offset: 12, size: 10, payloadOffset: 20, payloadSize: 1 },
      { id: "CCCC", offset: 22, size: 8, payloadOffset: 30, payloadSize: 0 },
    ]);
  });

  it("stops cleanly when a declared size would overflow the buffer", () => {
    const broken = Buffer.alloc(8);
    broken.write("XXXX", 0, 4, "latin1");
    broken.writeUInt32LE(9999, 4); // way past end of buffer
    expect(parseChunks({ buffer: broken, endianness: "little" })).toEqual([]);
  });
});

describe("big-endian (AIFF) chunks", () => {
  it("decodes size fields as big-endian", () => {
    const buffer = makeChunk({
      id: "COMM",
      payload: new Uint8Array([0, 1, 2, 3]),
      endianness: "big",
    });
    const chunks = parseChunks({ buffer, endianness: "big" });
    expect(chunks).toEqual([{ id: "COMM", offset: 0, size: 12, payloadOffset: 8, payloadSize: 4 }]);
  });
});
