import { Buffer } from "node:buffer";
import type { VorbisComment } from "../../../tags/vorbisComment/types.js";
import { writeVorbisComment } from "../../../tags/vorbisComment/writeVorbisComment.js";
import { FLAC_METADATA_BLOCK_HEADER_SIZE, FLAC_SIGNATURE, FlacBlockType } from "../constants.js";
import type { FlacBlock, FlacWritablePicture, ParsedFlac } from "../types.js";
import { buildMetadataBlock } from "./buildMetadataBlock.js";
import { buildPictureBlock } from "./buildPictureBlock.js";
import { rebalancePadding } from "./rebalancePadding.js";

/** Arguments for {@link buildFlac}. */
type Args = {
  /** Result of parsing the original file (provides STREAMINFO + pass-through blocks + audio offset). */
  parsed: ParsedFlac;
  /** Original file bytes (used to slice the audio payload after `parsed.audioOffset`). */
  source: Uint8Array;
  /** New Vorbis Comment block to embed. */
  vorbisComment: VorbisComment;
  /** Pictures to embed as `PICTURE` blocks (replaces any existing pictures). */
  pictures?: readonly FlacWritablePicture[];
  /** Padding body size to use when growth is unavoidable. */
  defaultPaddingBytes?: number;
};

/**
 * Rebuild a FLAC file with a new Vorbis Comment block (and optional pictures).
 *
 * Writes the file as `"fLaC" + STREAMINFO + pass-through blocks + new
 * VORBIS_COMMENT + PICTURE blocks + optional PADDING + audio`. The padding
 * size is chosen by {@link rebalancePadding} so the audio offset is preserved
 * whenever possible.
 *
 * The original file's `PICTURE` blocks are *not* preserved by default — the
 * caller is expected to pass the pictures they want via `pictures`. Pass-
 * through blocks (APPLICATION, SEEKTABLE, CUESHEET, unknown types) come back
 * verbatim from `parsed.passThroughBlocks`.
 *
 * @returns The rebuilt FLAC file bytes.
 */
export const buildFlac = (args: Args): Uint8Array => {
  const vorbisBody = writeVorbisComment(args.vorbisComment);
  const pictureBodies = (args.pictures ?? []).map(buildPictureBlock);

  // Pass-through blocks come from the parser (STREAMINFO included). We emit
  // them in the same order, then append the synthesized VORBIS_COMMENT and
  // PICTURE blocks. The `isLast` flag is patched in once we know which block
  // is actually last (it depends on whether padding ends up being emitted).
  const blocks: { type: number; data: Uint8Array }[] = [
    ...args.parsed.passThroughBlocks.map((block: FlacBlock) => ({
      type: block.type,
      data: block.data,
    })),
    { type: FlacBlockType.VorbisComment, data: vorbisBody },
    ...pictureBodies.map((data) => ({ type: FlacBlockType.Picture, data })),
  ];

  const nonPaddingSize = blocks.reduce(
    (sum, block) => sum + FLAC_METADATA_BLOCK_HEADER_SIZE + block.data.length,
    0,
  );

  // The "metadata region" excludes the 4-byte `"fLaC"` magic. `audioOffset`
  // sits just past the last metadata block, so subtracting the signature
  // size yields the byte budget we have to work with.
  const existingMetadataSize = args.parsed.audioOffset - FLAC_SIGNATURE.length;
  const padding = rebalancePadding({
    existingMetadataSize,
    nonPaddingSize,
    defaultPaddingBytes: args.defaultPaddingBytes,
  });

  const lastNonPaddingIndex = blocks.length - 1;
  const blockBuffers = blocks.map((block, index) =>
    buildMetadataBlock({
      type: block.type,
      data: block.data,
      isLast: !padding.emitPadding && index === lastNonPaddingIndex,
    }),
  );

  const paddingBuffer = padding.emitPadding
    ? buildMetadataBlock({
        type: FlacBlockType.Padding,
        data: new Uint8Array(padding.paddingBodyLen),
        isLast: true,
      })
    : new Uint8Array(0);

  const audio = args.source.subarray(args.parsed.audioOffset);
  const total = Buffer.concat([FLAC_SIGNATURE, ...blockBuffers, paddingBuffer, audio]);
  return new Uint8Array(total.buffer, total.byteOffset, total.byteLength);
};
