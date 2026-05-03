import { Buffer } from "node:buffer";
import type { LyricsInfo } from "../../../types.js";
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

/** Time format byte for absolute-millisecond timestamps. */
const TIME_FORMAT_MS = 0x02;

/** Content type byte for lyrics. */
const CONTENT_TYPE_LYRICS = 0x01;

/** Arguments for {@link lyricsToSylt}. */
type Args = {
  /** Source lyrics; must have a non-empty `synchronized` list. */
  lyrics: LyricsInfo;
  /** Body encoding (defaults to UTF-8). */
  encoding?: TextEncoding;
};

/**
 * Encode a {@link LyricsInfo} as an ID3v2 `SYLT` frame body.
 *
 * Layout: `<encoding:1><language:3><time-format:1><content-type:1><description:term>`
 * followed by repeated `<text:term><timestamp:UInt32BE>` records.
 *
 * Synchronized lyrics are always emitted with `time-format = 0x02` (absolute
 * milliseconds) and `content-type = 0x01` (lyrics). The language defaults to
 * `"eng"` when the lyrics record does not carry one.
 *
 * @returns The encoded `SYLT` body, or `undefined` when the lyrics carry no
 *   synchronized records.
 */
export const lyricsToSylt = ({ lyrics, encoding = "utf8" }: Args): Uint8Array | undefined => {
  if (lyrics.synchronized === undefined || lyrics.synchronized.length === 0) {
    return undefined;
  }

  const encByte = ENCODING_TO_BYTE[encoding];
  if (encByte === undefined) {
    throw new Error(`lyricsToSylt: unsupported encoding "${encoding}"`);
  }

  const isUtf16 = encoding === "utf16" || encoding === "utf16be" || encoding === "utf16le";
  const terminator = isUtf16 ? new Uint8Array([0x00, 0x00]) : new Uint8Array([0x00]);
  const language = padLanguage(lyrics.language ?? "eng");
  const description = encodeText(lyrics.description ?? "", encoding);

  const lineChunks: Uint8Array[] = [];
  for (const line of lyrics.synchronized) {
    const textBytes = encodeText(line.text, encoding);
    const timestamp = Buffer.alloc(4);
    timestamp.writeUInt32BE(Math.max(0, Math.floor(line.timeMs)) >>> 0, 0);
    lineChunks.push(textBytes, terminator, new Uint8Array(timestamp));
  }

  const out = Buffer.concat([
    Uint8Array.of(encByte),
    language,
    Uint8Array.of(TIME_FORMAT_MS),
    Uint8Array.of(CONTENT_TYPE_LYRICS),
    description,
    terminator,
    ...lineChunks,
  ]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Pad / truncate an ISO-639 code to exactly three Latin-1 bytes. */
const padLanguage = (lang: string): Uint8Array => {
  const lowered = lang.toLowerCase();
  const truncated = `${lowered}   `.slice(0, 3);
  return new Uint8Array(Buffer.from(truncated, "latin1"));
};
