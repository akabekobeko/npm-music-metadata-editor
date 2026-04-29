import { Buffer } from "node:buffer";

/** Lower-case the language code, then truncate or right-pad with spaces to 3 bytes. */
export const padLanguage = (lang: string): Uint8Array => {
  const lowered = lang.toLowerCase();
  const truncated = `${lowered}   `.slice(0, 3);
  return new Uint8Array(Buffer.from(truncated, "latin1"));
};
