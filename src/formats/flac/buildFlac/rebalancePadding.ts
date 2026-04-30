import { FLAC_DEFAULT_NEW_PADDING_BYTES, FLAC_METADATA_BLOCK_HEADER_SIZE } from "../constants.js";

/** Arguments for {@link rebalancePadding}. */
type Args = {
  /**
   * Total length in bytes of the **existing** metadata region, measured from
   * the byte after `"fLaC"` up to (but excluding) the first audio frame.
   */
  existingMetadataSize: number;
  /**
   * Total length in bytes of the new non-padding blocks (header + body for
   * each block, summed).
   */
  nonPaddingSize: number;
  /** Padding body size to use when growth is unavoidable. */
  defaultPaddingBytes?: number;
};

/** Result of {@link rebalancePadding}. */
type Result = {
  /** When `true`, the writer should emit a single padding block. */
  emitPadding: boolean;
  /** Body length of the padding block (`0` when no block is emitted). */
  paddingBodyLen: number;
};

/**
 * Decide whether to emit a padding block — and how big to make it — so that
 * the new metadata region matches the original size whenever possible.
 *
 * Cases:
 * - `nonPaddingSize === existingMetadataSize` → no padding, audio stays put.
 * - `nonPaddingSize + headerSize <= existingMetadataSize` → padding fills the
 *   gap, audio stays put.
 * - otherwise → emit a default-sized padding block (audio shifts; the writer
 *   has to rewrite the file).
 *
 * Note: when the gap is `1..3` bytes we cannot fit a 4-byte block header,
 * so we fall back to the "grow" branch — the audio shifts but the file stays
 * valid.
 */
export const rebalancePadding = (args: Args): Result => {
  const defaultPaddingBytes = args.defaultPaddingBytes ?? FLAC_DEFAULT_NEW_PADDING_BYTES;

  if (args.nonPaddingSize === args.existingMetadataSize) {
    return { emitPadding: false, paddingBodyLen: 0 };
  }

  const headroom = args.existingMetadataSize - args.nonPaddingSize;
  if (headroom >= FLAC_METADATA_BLOCK_HEADER_SIZE) {
    return {
      emitPadding: true,
      paddingBodyLen: headroom - FLAC_METADATA_BLOCK_HEADER_SIZE,
    };
  }

  return { emitPadding: true, paddingBodyLen: defaultPaddingBytes };
};
