import { Buffer } from "node:buffer";
import type { LyricsInfo, SynchronizedLyric } from "../../../types.js";
import { decodeText } from "../../../utils/encoding/decodeText.js";
import type { TextEncoding } from "../../../utils/encoding/types.js";

/** Map an ID3v2 encoding byte to a {@link TextEncoding} known to `decodeText`. */
const ENCODING_BY_BYTE: Readonly<Record<number, TextEncoding>> = {
  0: "latin1",
  1: "utf16",
  2: "utf16be",
  3: "utf8",
};

/** ID3v2 SYLT time-format byte for absolute milliseconds. */
const TIME_FORMAT_MS = 0x02;

/**
 * Decode an ID3v2 `SYLT` (synchronised lyrics / text) frame body into a
 * {@link LyricsInfo}.
 *
 * Layout: `<encoding:1><language:3><time-format:1><content-type:1><description:term>`
 * followed by repeated `<text:term><timestamp:UInt32BE>` records.
 *
 * Only `time-format = 0x02` (absolute milliseconds) is supported. Other
 * formats — chiefly `0x01` (MPEG frame index) — return `undefined` because we
 * cannot translate the timing without sample-rate context.
 *
 * @param body - Frame body bytes (after unsync / data-length unwrap).
 * @returns The decoded lyrics, or `undefined` when the body is malformed or
 *   uses an unsupported time format.
 */
export const syltToLyrics = (body: Uint8Array): LyricsInfo | undefined => {
  if (body.length < 6) {
    return undefined;
  }

  const encoding = ENCODING_BY_BYTE[body[0] as number];
  if (encoding === undefined) {
    return undefined;
  }

  const language = Buffer.from(body.subarray(1, 4)).toString("latin1").toLowerCase();
  const timeFormat = body[4];
  if (timeFormat !== TIME_FORMAT_MS) {
    return undefined;
  }

  const isUtf16 = encoding === "utf16" || encoding === "utf16be" || encoding === "utf16le";
  let cursor = 6; // skip encoding + language + time format + content type
  const descSlice = sliceUntilTerminator({ bytes: body, offset: cursor, isUtf16 });
  if (descSlice === undefined) {
    return undefined;
  }

  const description = decodeText(descSlice.bytes, encoding);
  cursor = descSlice.endOffset;

  const synchronized: SynchronizedLyric[] = [];
  while (cursor < body.length) {
    const textSlice = sliceUntilTerminator({ bytes: body, offset: cursor, isUtf16 });
    if (textSlice === undefined) {
      break;
    }

    cursor = textSlice.endOffset;
    if (cursor + 4 > body.length) {
      break;
    }

    const view = Buffer.from(body.buffer, body.byteOffset + cursor, 4);
    const timeMs = view.readUInt32BE(0);
    cursor += 4;
    synchronized.push({ timeMs, text: decodeText(textSlice.bytes, encoding) });
  }

  if (synchronized.length === 0) {
    return undefined;
  }

  const lyrics: LyricsInfo = { synchronized };
  if (language !== "") {
    lyrics.language = language;
  }

  if (description !== "") {
    lyrics.description = description;
  }

  return lyrics;
};

/** Arguments for {@link sliceUntilTerminator}. */
type SliceArgs = {
  /** Source bytes. */
  bytes: Uint8Array;
  /** Byte offset to start scanning from. */
  offset: number;
  /** `true` when the active encoding uses 2-byte terminators. */
  isUtf16: boolean;
};

/**
 * Walk forward from `offset` until the encoding-aware terminator
 * (`0x00` or `0x00 0x00`) is found, returning the slice up to it plus the
 * offset past the terminator.
 *
 * @returns The decoded slice + post-terminator offset, or `undefined` when no
 *   terminator was found before the end of the buffer.
 */
const sliceUntilTerminator = ({
  bytes,
  offset,
  isUtf16,
}: SliceArgs): { bytes: Uint8Array; endOffset: number } | undefined => {
  if (isUtf16) {
    for (let i = offset; i + 1 < bytes.length; i += 2) {
      if (bytes[i] === 0x00 && bytes[i + 1] === 0x00) {
        return { bytes: bytes.subarray(offset, i), endOffset: i + 2 };
      }
    }

    return undefined;
  }

  const idx = bytes.indexOf(0x00, offset);
  if (idx === -1) {
    return undefined;
  }

  return { bytes: bytes.subarray(offset, idx), endOffset: idx + 1 };
};
