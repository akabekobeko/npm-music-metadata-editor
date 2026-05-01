import { Buffer } from "node:buffer";
import { writeBox } from "./writeBox.js";

/** Bytes consumed by the FullBox version+flags prefix on `mean` / `name`. */
const FULLBOX_PREFIX_SIZE = 4;

/**
 * Serialize a `mean` or `name` FullBox carrying an ASCII string.
 *
 * @param type - `"mean"` or `"name"`.
 * @param text - The string payload (Latin-1 / ASCII; not null-terminated).
 * @returns The encoded box bytes.
 */
export const writeFullBoxString = (type: string, text: string): Uint8Array => {
  const stringBytes = Buffer.from(text, "latin1");
  const payload = Buffer.alloc(FULLBOX_PREFIX_SIZE + stringBytes.length);
  // Version + flags = 0
  payload.writeUInt32BE(0, 0);
  stringBytes.copy(payload, FULLBOX_PREFIX_SIZE);
  return writeBox(type, new Uint8Array(payload));
};
