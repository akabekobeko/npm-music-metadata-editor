import { readFile, writeFile } from "node:fs/promises";

/**
 * Read a file from disk and return its contents as a `Uint8Array`.
 *
 * The entire file is loaded into memory; streaming reads for very large files
 * are out of scope.
 *
 * @param path - Absolute or relative path to the file.
 * @returns The file contents as a `Uint8Array` view sharing memory with the underlying `Buffer`.
 */
export const readFileBuffer = async (path: string): Promise<Uint8Array> => {
  const buffer = await readFile(path);
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
};

/**
 * Write bytes to a file on disk, creating or replacing it.
 *
 * @param path - Destination path; the parent directory must already exist.
 * @param bytes - Bytes to write.
 */
export const writeFileBuffer = async (path: string, bytes: Uint8Array): Promise<void> => {
  await writeFile(path, bytes);
};
