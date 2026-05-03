import { Buffer } from "node:buffer";
import type { PictureInfo, PictureKindValue } from "../../../types.js";
import { PictureKind } from "../../../types.js";
import { decodeText } from "../../../utils/encoding/decodeText.js";
import type { TextEncoding } from "../../../utils/encoding/types.js";

/** Map an ID3v2 encoding byte to a {@link TextEncoding} known to `decodeText`. */
const ENCODING_BY_BYTE: Readonly<Record<number, TextEncoding>> = {
  0: "latin1",
  1: "utf16",
  2: "utf16be",
  3: "utf8",
};

/**
 * Decode an ID3v2 `APIC` frame body into a {@link PictureInfo}.
 *
 * APIC layout (v2.3 / v2.4): `<encoding:1><mime:Latin1+\0><kind:1><description:term><data...>`.
 *
 * The MIME field is always Latin-1 (per the ID3v2 spec). The description uses
 * the same encoding as the leading byte; the terminator size matches the
 * encoding (1 byte for Latin-1 / UTF-8, 2 bytes for UTF-16 family).
 *
 * @param body - APIC frame body (post unsync / data-length unwrap).
 * @returns The decoded picture, or `undefined` when the body is malformed.
 */
export const apicToPicture = (body: Uint8Array): PictureInfo | undefined => {
  if (body.length < 4) {
    return undefined;
  }

  const encoding = ENCODING_BY_BYTE[body[0] as number];
  if (encoding === undefined) {
    return undefined;
  }

  const mimeEnd = body.indexOf(0x00, 1);
  if (mimeEnd === -1) {
    return undefined;
  }

  const mimeBytes = body.subarray(1, mimeEnd);
  const mimeType =
    mimeBytes.length === 0 ? "image/jpeg" : Buffer.from(mimeBytes).toString("latin1");

  const kindOffset = mimeEnd + 1;
  if (kindOffset >= body.length) {
    return undefined;
  }

  const kind = body[kindOffset] as PictureKindValue;
  const descStart = kindOffset + 1;

  const isUtf16 = encoding === "utf16" || encoding === "utf16be" || encoding === "utf16le";
  const split = splitOnFirstTerminator(body.subarray(descStart), isUtf16);
  if (split === undefined) {
    return undefined;
  }

  const description = decodeText(split.first, encoding);
  return {
    mimeType,
    kind: kind ?? PictureKind.Other,
    description,
    data: split.second,
  };
};

/** Split bytes at the first encoding-aware terminator into description / data. */
const splitOnFirstTerminator = (
  bytes: Uint8Array,
  isUtf16: boolean,
): { first: Uint8Array; second: Uint8Array } | undefined => {
  if (isUtf16) {
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      if (bytes[i] === 0x00 && bytes[i + 1] === 0x00) {
        return { first: bytes.subarray(0, i), second: bytes.subarray(i + 2) };
      }
    }

    return undefined;
  }

  const idx = bytes.indexOf(0x00);
  if (idx === -1) {
    return undefined;
  }

  return { first: bytes.subarray(0, idx), second: bytes.subarray(idx + 1) };
};
