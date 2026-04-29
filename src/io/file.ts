import { readFile } from "node:fs/promises";

/**
 * Read a file from disk and return its contents as a `Uint8Array`.
 *
 * Streaming reads for very large files are out of scope for Phase 1 — the entire file
 * is loaded into memory. Phase 10 revisits this for arbitrary-sized inputs.
 *
 * @param path - Absolute or relative path to the file.
 * @returns The file contents as a `Uint8Array` view sharing memory with the underlying `Buffer`.
 */
export const readFileBuffer = async (path: string): Promise<Uint8Array> => {
  const buffer = await readFile(path);
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
};
