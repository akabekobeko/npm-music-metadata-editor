import { Buffer } from "node:buffer";
import { apicToPicture } from "../../../extras/picture/converters/apicToPicture.js";
import { parseFrame } from "../../../tags/id3v2/parseId3v2/parseFrame/parseFrame.js";
import { parseTextFrame } from "../../../tags/id3v2/parseId3v2/parseTextFrame/parseTextFrame.js";
import type { Id3v2Frame, Id3v2MajorVersion } from "../../../tags/id3v2/types.js";
import type { ChapterInfo } from "../../../types.js";

/** Arguments for {@link chapToChapter}. */
type Args = {
  /** Frame body bytes (after unsync / data-length unwrap). */
  body: Uint8Array;
  /** Containing tag's major version (controls how the embedded sub-frames are parsed). */
  majorVersion: Id3v2MajorVersion;
};

/**
 * Decode an ID3v2 `CHAP` frame body into a {@link ChapterInfo}.
 *
 * Layout:
 * ```
 *   Element ID    (Latin-1, null-terminated)
 *   Start time    (4 bytes UInt32 BE, milliseconds)
 *   End time      (4 bytes UInt32 BE, milliseconds)
 *   Start offset  (4 bytes UInt32 BE, byte offset; 0xFFFFFFFF = ignore)
 *   End offset    (4 bytes UInt32 BE, byte offset; 0xFFFFFFFF = ignore)
 *   Sub-frames    (any frames; typically TIT2 for the title, WXXX for the URL,
 *                  APIC for an embedded picture)
 * ```
 *
 * @returns The decoded chapter, or `undefined` when the body is malformed.
 */
export const chapToChapter = ({ body, majorVersion }: Args): ChapterInfo | undefined => {
  const idEnd = body.indexOf(0x00);
  if (idEnd === -1 || idEnd + 1 + 16 > body.length) {
    return undefined;
  }

  const id = Buffer.from(body.subarray(0, idEnd)).toString("latin1");
  const view = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  const startMs = view.readUInt32BE(idEnd + 1);
  const endMs = view.readUInt32BE(idEnd + 5);
  const subFrames = readSubFrames({ body, offset: idEnd + 1 + 16, majorVersion });

  const chapter: ChapterInfo = { id, startMs, endMs };
  for (const frame of subFrames) {
    if (frame.id === "TIT2") {
      const title = parseTextFrame(frame.data);
      if (title !== undefined && title !== "") {
        chapter.title = title;
      }

      continue;
    }

    if (frame.id === "WXXX") {
      const url = parseWxxxUrl(frame.data);
      if (url !== undefined && url !== "") {
        chapter.url = url;
      }

      continue;
    }

    if (frame.id === "APIC") {
      const picture = apicToPicture(frame.data);
      if (picture !== undefined) {
        chapter.picture = picture;
      }
    }
  }

  return chapter;
};

/** Arguments for {@link readSubFrames}. */
type SubFramesArgs = {
  /** Outer CHAP body bytes. */
  body: Uint8Array;
  /** Offset within `body` where the embedded sub-frames begin. */
  offset: number;
  /** ID3v2 major version (forwarded to {@link parseFrame}). */
  majorVersion: Id3v2MajorVersion;
};

/**
 * Read every sub-frame embedded inside a CHAP / CTOC body.
 *
 * Iteration follows the same rules as the top-level frame loop in
 * `parseId3v2`: a leading `0x00` is treated as padding, parser errors stop
 * iteration, and partial frames are skipped.
 *
 * @returns The decoded sub-frames in body order.
 */
const readSubFrames = ({ body, offset, majorVersion }: SubFramesArgs): readonly Id3v2Frame[] => {
  const out: Id3v2Frame[] = [];
  let cursor = offset;
  while (cursor < body.length) {
    const result = parseFrame({ body, offset: cursor, majorVersion });
    if (result.kind === "padding" || result.kind === "error") {
      break;
    }

    out.push(result.frame);
    cursor += result.consumed;
  }

  return out;
};

/**
 * Decode the URL component of a `WXXX` (User defined URL link) frame.
 *
 * Layout: `<encoding:1><description:term><url:Latin-1>`. We follow ATL.NET's
 * convention and treat the URL as Latin-1 regardless of the description
 * encoding.
 *
 * @param body - Frame body bytes.
 * @returns The decoded URL, or `undefined` when the body is malformed.
 */
const parseWxxxUrl = (body: Uint8Array): string | undefined => {
  if (body.length < 2) {
    return undefined;
  }

  const encoding = body[0];
  const isUtf16 = encoding === 0x01 || encoding === 0x02;
  let cursor = 1;
  if (isUtf16) {
    while (cursor + 1 < body.length) {
      if (body[cursor] === 0x00 && body[cursor + 1] === 0x00) {
        cursor += 2;
        break;
      }

      cursor += 2;
    }
  } else {
    while (cursor < body.length && body[cursor] !== 0x00) {
      cursor += 1;
    }

    cursor += 1;
  }

  if (cursor > body.length) {
    return undefined;
  }

  return Buffer.from(body.subarray(cursor)).toString("latin1");
};
