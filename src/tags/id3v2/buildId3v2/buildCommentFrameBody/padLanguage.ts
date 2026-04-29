import { Buffer } from "node:buffer";

/**
 * Lower-case the language code, then truncate or right-pad with spaces to 3 bytes.
 *
 * @param lang - ISO-639 language code (any length; truncated when longer than 3).
 * @returns Exactly 3 Latin-1 bytes ready to embed in a `COMM` / `USLT` body.
 */
export const padLanguage = (lang: string): Uint8Array => {
  const lowered = lang.toLowerCase();
  const truncated = `${lowered}   `.slice(0, 3);
  return new Uint8Array(Buffer.from(truncated, "latin1"));
};
