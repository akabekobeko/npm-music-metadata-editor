import type { TagData } from "../../../types.js";
import type { TextEncoding } from "../../../utils/encoding/types.js";
import { buildCommentFrameBody } from "../buildId3v2/buildCommentFrameBody/buildCommentFrameBody.js";
import type { Id3v2Frame } from "../types.js";
import { appendSlashPair } from "./appendSlashPair.js";
import { buildTextFrame } from "./buildTextFrame.js";
import { NO_FRAME_FLAGS, TAG_FIELD_TO_FRAME_ID } from "./constants.js";

/** Convert a {@link TagData} value into the ordered list of frames to emit. */
export const synthesizeFrames = (tag: Partial<TagData>, majorVersion: 3 | 4): Id3v2Frame[] => {
  const encoding: TextEncoding = majorVersion === 4 ? "utf8" : "latin1";
  const frames: Id3v2Frame[] = [];

  const textFields: (keyof TagData)[] = [
    "title",
    "artist",
    "albumArtist",
    "album",
    "composer",
    "conductor",
    "lyricist",
    "publisher",
    "copyright",
    "genre",
    "group",
    "description",
    "language",
    "isrc",
    "year",
    "recordingDate",
    "originalReleaseDate",
    "publishingDate",
    "bpm",
  ];
  for (const field of textFields) {
    const value = tag[field];
    if (value === undefined || value === "") {
      continue;
    }

    const frameId = TAG_FIELD_TO_FRAME_ID[field];
    if (frameId === undefined) {
      continue;
    }

    frames.push(buildTextFrame({ id: frameId, text: String(value), encoding }));
  }

  appendSlashPair({
    frames,
    tag,
    numberField: "trackNumber",
    totalField: "trackTotal",
    frameId: "TRCK",
    encoding,
  });
  appendSlashPair({
    frames,
    tag,
    numberField: "discNumber",
    totalField: "discTotal",
    frameId: "TPOS",
    encoding,
  });

  if (tag.comment !== undefined && tag.comment !== "") {
    frames.push({
      id: "COMM",
      flags: NO_FRAME_FLAGS,
      data: buildCommentFrameBody({
        encoding,
        language: "eng",
        description: "",
        text: tag.comment,
      }),
    });
  }

  return frames;
};
