import { Buffer } from "node:buffer";
import type { PictureInfo } from "../../../types.js";
import { encodeText } from "../../../utils/encoding/encodeText.js";
import type { TextEncoding } from "../../../utils/encoding/types.js";

/** Map a description encoding name back to the ID3v2 encoding selector byte. */
const ENCODING_TO_BYTE: Readonly<Record<string, number>> = {
  latin1: 0x00,
  utf16: 0x01,
  utf16le: 0x01,
  utf16be: 0x02,
  utf8: 0x03,
};

/** Arguments for {@link pictureToApic}. */
type Args = {
  /** Picture to encode. */
  picture: PictureInfo;
  /**
   * Encoding to use for the description text.
   * Defaults to `"utf8"` so the writer never silently corrupts non-Latin text.
   */
  encoding?: TextEncoding;
};

/**
 * Encode a {@link PictureInfo} as an ID3v2 `APIC` frame body.
 *
 * The MIME string is forced to Latin-1 (spec-mandated). The description uses
 * the encoding selected by `encoding`; the terminator size after it matches
 * the encoding (1 byte for Latin-1 / UTF-8, 2 bytes for UTF-16).
 *
 * @returns The APIC body bytes ready to wrap in a frame header.
 */
export const pictureToApic = ({ picture, encoding = "utf8" }: Args): Uint8Array => {
  const encByte = ENCODING_TO_BYTE[encoding];
  if (encByte === undefined) {
    throw new Error(`pictureToApic: unsupported encoding "${encoding}"`);
  }

  const mimeBytes = Buffer.from(picture.mimeType, "latin1");
  const descBytes = encodeText(picture.description ?? "", encoding);
  const isUtf16 = encoding === "utf16" || encoding === "utf16be" || encoding === "utf16le";
  const descTerminator = isUtf16 ? new Uint8Array([0x00, 0x00]) : new Uint8Array([0x00]);

  const out = Buffer.concat([
    Uint8Array.of(encByte),
    mimeBytes,
    Uint8Array.of(0x00),
    Uint8Array.of(picture.kind),
    descBytes,
    descTerminator,
    picture.data,
  ]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
