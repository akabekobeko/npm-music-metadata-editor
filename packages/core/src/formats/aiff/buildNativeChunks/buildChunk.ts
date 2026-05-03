import { Buffer } from "node:buffer";

/** Arguments for {@link buildChunk}. */
type Args = {
  /** 4-character chunk ID (latin1; padded / truncated to exactly 4 bytes). */
  id: string;
  /** Encoded chunk payload. */
  payload: Uint8Array;
};

/**
 * Build a single AIFF chunk: 4-byte ID + 4-byte big-endian size + payload +
 * optional 1-byte zero pad to keep the next chunk on an even boundary.
 *
 * The pad byte is added when `payload.length` is odd; the size field in the
 * header always reports the *declared* payload size (the pad byte is not
 * counted), per the IFF specification.
 *
 * @returns The assembled chunk bytes.
 */
export const buildChunk = ({ id, payload }: Args): Uint8Array => {
  const padding = payload.length % 2;
  const out = Buffer.alloc(8 + payload.length + padding);
  out.write(id.padEnd(4, " ").slice(0, 4), 0, 4, "latin1");
  out.writeUInt32BE(payload.length, 4);
  out.set(payload, 8);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
