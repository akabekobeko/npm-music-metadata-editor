import { Buffer } from "node:buffer";

/**
 * Drain an async iterable of byte chunks into a single `Uint8Array`.
 *
 * Used to materialise stdin for the `mme read --stdin` flow. Consuming the
 * whole stream up front matches the core `readMetadata` API, which expects a
 * complete byte buffer.
 *
 * @param stream - Async iterable yielding chunks. `process.stdin` and
 *   the test harness both implement this shape.
 * @returns The concatenated bytes.
 */
export const collectStdin = async (stream: AsyncIterable<Uint8Array>): Promise<Uint8Array> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const merged = Buffer.concat(chunks);
  return new Uint8Array(merged.buffer, merged.byteOffset, merged.byteLength);
};
