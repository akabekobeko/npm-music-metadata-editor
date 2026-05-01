import { Buffer } from "node:buffer";
import { ItunesDataType } from "../../constants.js";
import type { ItunesDataValue } from "../../types.js";

/**
 * Encode a UTF-8 text value as one `data` payload.
 *
 * @param text - Text to encode.
 * @returns A {@link ItunesDataValue} carrying the UTF-8 bytes.
 */
export const utf8Value = (text: string): ItunesDataValue => ({
  typeIndicator: ItunesDataType.Utf8,
  locale: 0,
  data: new Uint8Array(Buffer.from(text, "utf8")),
});
