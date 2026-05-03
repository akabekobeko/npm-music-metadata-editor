import { Buffer } from "node:buffer";
import { pictureToApic } from "../../../extras/picture/converters/pictureToApic.js";
import { buildFrame } from "../../../tags/id3v2/buildId3v2/buildFrame.js";
import { buildTextFrameBody } from "../../../tags/id3v2/buildId3v2/buildTextFrameBody.js";
import type { Id3v2Frame } from "../../../tags/id3v2/types.js";
import { NO_FRAME_FLAGS } from "../../../tags/id3v2/writeId3v2/constants.js";
import type { ChapterInfo } from "../../../types.js";
import type { TextEncoding } from "../../../utils/encoding/types.js";

/** Arguments for {@link chapterToChap}. */
type Args = {
  /** Source chapter. */
  chapter: ChapterInfo;
  /** Target ID3v2 major version (`3` or `4`) — controls the sub-frame size encoding. */
  majorVersion: 3 | 4;
  /** Text encoding for the embedded sub-frames (defaults to UTF-8). */
  encoding?: TextEncoding;
};

/** Encoding selector byte for the `WXXX` description prefix. */
const ENCODING_TO_BYTE: Readonly<Record<string, number>> = {
  latin1: 0x00,
  utf16: 0x01,
  utf16le: 0x01,
  utf16be: 0x02,
  utf8: 0x03,
};

/**
 * Encode a {@link ChapterInfo} as an ID3v2 `CHAP` frame.
 *
 * Layout:
 * ```
 *   Element ID    (Latin-1, null-terminated)
 *   Start time    (4 bytes UInt32 BE, milliseconds)
 *   End time      (4 bytes UInt32 BE, milliseconds)
 *   Start offset  (always 0xFFFFFFFF — byte offsets are not surfaced)
 *   End offset    (always 0xFFFFFFFF — byte offsets are not surfaced)
 *   Sub-frames    (TIT2 for `title`, WXXX for `url`, APIC for `picture`)
 * ```
 *
 * @returns The frame ready to embed in a tag (the parent writer wraps it in a
 *   standard 10-byte frame header via {@link buildFrame} when emitting).
 */
export const chapterToChap = ({ chapter, majorVersion, encoding = "utf8" }: Args): Id3v2Frame => {
  const elementId = Buffer.from(chapter.id, "latin1");
  const fixed = Buffer.alloc(16);
  fixed.writeUInt32BE(Math.max(0, Math.floor(chapter.startMs)) >>> 0, 0);
  fixed.writeUInt32BE(Math.max(0, Math.floor(chapter.endMs)) >>> 0, 4);
  fixed.writeUInt32BE(0xffffffff, 8);
  fixed.writeUInt32BE(0xffffffff, 12);

  const subFrameBytes: Uint8Array[] = [];
  if (chapter.title !== undefined && chapter.title !== "") {
    subFrameBytes.push(
      buildFrame({
        frame: {
          id: "TIT2",
          flags: NO_FRAME_FLAGS,
          data: buildTextFrameBody({ text: chapter.title, encoding }),
        },
        majorVersion,
      }),
    );
  }

  if (chapter.url !== undefined && chapter.url !== "") {
    subFrameBytes.push(
      buildFrame({
        frame: {
          id: "WXXX",
          flags: NO_FRAME_FLAGS,
          data: buildWxxxBody({ url: chapter.url, encoding }),
        },
        majorVersion,
      }),
    );
  }

  if (chapter.picture !== undefined) {
    subFrameBytes.push(
      buildFrame({
        frame: {
          id: "APIC",
          flags: NO_FRAME_FLAGS,
          data: pictureToApic({ picture: chapter.picture, encoding }),
        },
        majorVersion,
      }),
    );
  }

  const body = Buffer.concat([
    elementId,
    Uint8Array.of(0x00),
    new Uint8Array(fixed.buffer, fixed.byteOffset, fixed.byteLength),
    ...subFrameBytes,
  ]);
  return {
    id: "CHAP",
    flags: NO_FRAME_FLAGS,
    data: new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
  };
};

/** Arguments for {@link buildWxxxBody}. */
type WxxxArgs = {
  /** URL to embed (always Latin-1 per the ID3v2 spec). */
  url: string;
  /** Encoding for the (empty) description prefix. */
  encoding: TextEncoding;
};

/**
 * Encode the body of a `WXXX` (User defined URL link) frame.
 *
 * Layout: `<encoding:1><description:term><url:Latin-1>`. Description is always
 * empty here — the chapter writer just needs the URL.
 *
 * @returns The body bytes.
 */
const buildWxxxBody = ({ url, encoding }: WxxxArgs): Uint8Array => {
  const encByte = ENCODING_TO_BYTE[encoding];
  if (encByte === undefined) {
    throw new Error(`buildWxxxBody: unsupported encoding "${encoding}"`);
  }

  const isUtf16 = encoding === "utf16" || encoding === "utf16be" || encoding === "utf16le";
  const descTerm = isUtf16 ? new Uint8Array([0x00, 0x00]) : new Uint8Array([0x00]);
  const urlBytes = Buffer.from(url, "latin1");
  const out = Buffer.concat([Uint8Array.of(encByte), descTerm, urlBytes]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
