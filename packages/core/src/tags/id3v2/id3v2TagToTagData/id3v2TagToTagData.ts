import type { TagData } from "../../../types.js";
import { parseCommentFrame } from "../parseId3v2/parseCommentFrame/parseCommentFrame.js";
import type { Id3v2Tag } from "../types.js";
import { assignTextFrame } from "./assignTextFrame.js";

/**
 * Project an {@link Id3v2Tag}'s frames onto our high-level {@link TagData} shape.
 *
 * Only frames listed in {@link ID3V2_TEXT_FRAME_MAP} are surfaced; everything
 * else is left in `tag.frames` for round-trip preservation. `TRCK` / `TPOS`
 * "X/Y" strings split into number + total fields.
 *
 * @param tag - Parsed ID3v2 tag.
 * @returns A `TagData` populated with the recognised text/comment fields.
 */
export const id3v2TagToTagData = (tag: Id3v2Tag): TagData => {
  const result: TagData = {};
  for (const frame of tag.frames) {
    if (frame.id === "COMM") {
      const comment = parseCommentFrame(frame.data);
      if (comment !== undefined && comment.text !== "") {
        result.comment = comment.text;
      }

      continue;
    }

    if (frame.id.startsWith("T") && frame.id !== "TXXX") {
      assignTextFrame({ target: result, frameId: frame.id, body: frame.data });
    }
  }

  return result;
};
