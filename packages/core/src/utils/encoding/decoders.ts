/** Shared `TextDecoder` for UTF-16BE bytes (the WHATWG label `Buffer` does not accept). */
export const utf16beDecoder = new TextDecoder("utf-16be");

/** Shared `TextDecoder` for UTF-16LE bytes; reused for BOM-less decoding. */
export const utf16leDecoder = new TextDecoder("utf-16le");
