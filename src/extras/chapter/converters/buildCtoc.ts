import { Buffer } from "node:buffer";
import { buildFrame } from "../../../tags/id3v2/buildId3v2/buildFrame.js";
import { buildTextFrameBody } from "../../../tags/id3v2/buildId3v2/buildTextFrameBody.js";
import type { Id3v2Frame } from "../../../tags/id3v2/types.js";
import { NO_FRAME_FLAGS } from "../../../tags/id3v2/writeId3v2/constants.js";
import type { TextEncoding } from "../../../utils/encoding/types.js";

/** Arguments for {@link buildCtoc}. */
type Args = {
  /** Element ID assigned to the CTOC entry (`"toc"` is the conventional value). */
  id: string;
  /** Element IDs of every chapter / nested CTOC referenced by this entry. */
  childElementIds: readonly string[];
  /** `true` when this CTOC is the top-level entry. */
  isTopLevel: boolean;
  /** `true` when the children appear in playback order. */
  ordered: boolean;
  /** Optional description (emitted as an embedded `TIT2` sub-frame when set). */
  description?: string;
  /** Target ID3v2 major version (`3` or `4`). */
  majorVersion: 3 | 4;
  /** Encoding to use for the embedded `TIT2` description (defaults to UTF-8). */
  encoding?: TextEncoding;
};

/**
 * Encode a top-level (or nested) `CTOC` frame.
 *
 * Layout:
 * ```
 *   Element ID    (Latin-1, null-terminated)
 *   Flags         (1 byte: bit 0 = top-level, bit 1 = ordered)
 *   Entry count   (1 byte)
 *   Element IDs   (entry-count of Latin-1 null-terminated strings)
 *   Sub-frames    (TIT2 carrying the description, when supplied)
 * ```
 *
 * @returns The encoded `CTOC` frame.
 */
export const buildCtoc = ({
  id,
  childElementIds,
  isTopLevel,
  ordered,
  description,
  majorVersion,
  encoding = "utf8",
}: Args): Id3v2Frame => {
  if (childElementIds.length > 0xff) {
    throw new RangeError(
      `buildCtoc: too many child entries (${childElementIds.length}); CTOC supports at most 255`,
    );
  }

  const elementId = Buffer.from(id, "latin1");
  const flagsByte = (isTopLevel ? 0x01 : 0x00) | (ordered ? 0x02 : 0x00);
  const childBytes: Uint8Array[] = childElementIds.flatMap((childId) => {
    const buf = Buffer.from(childId, "latin1");
    return [new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), Uint8Array.of(0x00)];
  });
  const subFrames: Uint8Array[] = [];
  if (description !== undefined && description !== "") {
    subFrames.push(
      buildFrame({
        frame: {
          id: "TIT2",
          flags: NO_FRAME_FLAGS,
          data: buildTextFrameBody({ text: description, encoding }),
        },
        majorVersion,
      }),
    );
  }

  const body = Buffer.concat([
    new Uint8Array(elementId.buffer, elementId.byteOffset, elementId.byteLength),
    Uint8Array.of(0x00),
    Uint8Array.of(flagsByte),
    Uint8Array.of(childElementIds.length),
    ...childBytes,
    ...subFrames,
  ]);
  return {
    id: "CTOC",
    flags: NO_FRAME_FLAGS,
    data: new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
  };
};
