import { readVorbisComment } from "../../../tags/vorbisComment/readVorbisComment.js";
import {
  FLAC_METADATA_BLOCK_HEADER_SIZE,
  FLAC_SIGNATURE,
  FLAC_SIGNATURE_SIZE,
  FlacBlockType,
} from "../constants.js";
import type { FlacBlock, FlacPicture, ParsedFlac } from "../types.js";
import { parseMetadataBlockHeader } from "./parseMetadataBlockHeader.js";
import { parsePictureBlock } from "./parsePictureBlock.js";
import { parseStreamInfo } from "./parseStreamInfo.js";

/**
 * Verify the leading `"fLaC"` marker is present.
 *
 * @param input - Whole-file bytes.
 * @throws Error when the signature does not match.
 */
const ensureSignature = (input: Uint8Array): void => {
  const ok =
    input.length >= FLAC_SIGNATURE_SIZE &&
    input[0] === FLAC_SIGNATURE[0] &&
    input[1] === FLAC_SIGNATURE[1] &&
    input[2] === FLAC_SIGNATURE[2] &&
    input[3] === FLAC_SIGNATURE[3];
  if (!ok) {
    throw new Error('parseFlac: missing "fLaC" stream marker');
  }
};

/**
 * Parse the metadata region of a FLAC file.
 *
 * Walks the linked list of metadata blocks starting just after `"fLaC"`,
 * decoding `STREAMINFO`, `VORBIS_COMMENT`, and `PICTURE` blocks while
 * preserving every other block verbatim so the writer can re-emit them.
 *
 * @param input - Whole-file bytes.
 * @returns A {@link ParsedFlac} describing the metadata region and the audio
 *   start offset.
 * @throws Error when the signature is missing, the STREAMINFO block is
 *   misplaced, or a metadata block extends past the file.
 */
export const parseFlac = (input: Uint8Array): ParsedFlac => {
  ensureSignature(input);

  const passThroughBlocks: FlacBlock[] = [];
  const pictures: FlacPicture[] = [];

  let pos = FLAC_SIGNATURE_SIZE;
  let streamInfo: ParsedFlac["streamInfo"] | undefined;
  let vorbisComment: ParsedFlac["vorbisComment"] | undefined;

  // Walk the metadata block chain. The loop terminates when a block carries
  // the `is_last` flag (or, defensively, when we run out of bytes).
  while (pos + FLAC_METADATA_BLOCK_HEADER_SIZE <= input.length) {
    const header = parseMetadataBlockHeader(input, pos);
    pos += FLAC_METADATA_BLOCK_HEADER_SIZE;
    if (pos + header.length > input.length) {
      throw new Error(`parseFlac: metadata block (type ${header.type}) extends past end of file`);
    }

    const body = input.subarray(pos, pos + header.length);
    pos += header.length;

    switch (header.type) {
      case FlacBlockType.StreamInfo: {
        streamInfo = parseStreamInfo(body);
        // Preserve STREAMINFO verbatim so the writer can re-emit it without
        // having to round-trip through `FlacStreamInfo`.
        passThroughBlocks.push({ type: header.type, data: body });
        break;
      }

      case FlacBlockType.VorbisComment: {
        vorbisComment = readVorbisComment(body);
        break;
      }

      case FlacBlockType.Picture: {
        pictures.push(parsePictureBlock(body));
        break;
      }

      case FlacBlockType.Padding: {
        // Padding is dropped — the writer rebuilds it from scratch so the
        // total metadata region matches the audio offset budget.
        break;
      }

      default: {
        passThroughBlocks.push({ type: header.type, data: body });
        break;
      }
    }

    if (header.isLast) {
      break;
    }
  }

  if (streamInfo === undefined) {
    throw new Error("parseFlac: STREAMINFO block missing");
  }

  return {
    streamInfo,
    vorbisComment,
    pictures,
    passThroughBlocks,
    audioOffset: pos,
    metadataRegionSize: pos,
  };
};
