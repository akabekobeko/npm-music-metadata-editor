import { readVorbisComment } from "../../../tags/vorbisComment/readVorbisComment.js";
import type { VorbisComment } from "../../../tags/vorbisComment/types.js";
import { assemblePackets } from "../packet/assemblePackets.js";
import { parseOggPages } from "../page/parseOggPages.js";
import {
  isOpusCommentPacket,
  isOpusIdPacket,
  parseOpusIdPacket,
  stripOpusCommentMagic,
} from "../streams/opus.js";
import {
  isVorbisCommentPacket,
  isVorbisIdPacket,
  parseVorbisIdPacket,
  stripVorbisCommentMagic,
} from "../streams/vorbis.js";
import type { OggCodecInfo, OggPage } from "../types.js";

/**
 * Result of decoding the header region of an Ogg file.
 *
 * `pages` is the full page sequence read from the input — callers use it both
 * to surface the codec info and to splice new header pages without
 * re-parsing.
 */
export type ParsedOggHeaders = {
  /** Every page in the input, in source order. */
  pages: readonly OggPage[];
  /** Logical bitstream serial number of the audio stream. */
  serialNumber: number;
  /** Codec + sample rate + channels decoded from the BOS packet. */
  codecInfo: OggCodecInfo;
  /** Identification packet bytes (BOS packet payload, with codec magic intact). */
  idPacket: Uint8Array;
  /** Vorbis Comment payload extracted from the comment packet. */
  vorbisComment: VorbisComment;
  /**
   * Indexes (within `pages`) of pages contributing to header packets that
   * follow the BOS page (i.e. comment + Vorbis setup). The writer drops
   * these pages and replaces them with freshly re-paged ones.
   */
  headerPageIndices: readonly number[];
  /**
   * Vorbis setup packet bytes when the codec is Vorbis. Preserved verbatim so
   * the writer can re-emit them after a comment rewrite. `undefined` for
   * Opus (which has no setup packet).
   */
  vorbisSetupPacket?: Uint8Array;
};

/**
 * Walk the leading pages of an Ogg file, identify the codec, and decode the
 * Vorbis Comment block carried by the comment packet.
 *
 * Multiplexed Ogg streams (multiple logical bitstreams interleaved) are out
 * of scope for Phase 5 — every page must share the BOS page's serial number
 * or the function throws.
 *
 * @param input - Whole-file bytes.
 * @returns A {@link ParsedOggHeaders} describing the header region.
 * @throws Error when the file does not start with a recognised Ogg page,
 *   when the comment packet is missing / malformed, or when the file
 *   contains multiple logical bitstreams.
 */
export const parseOggHeaders = (input: Uint8Array): ParsedOggHeaders => {
  const pages = Array.from(parseOggPages(input));
  const bosPage = pages[0];
  if (bosPage === undefined) {
    throw new Error("parseOggHeaders: input does not start with an Ogg page");
  }

  const serialNumber = bosPage.serialNumber;
  if (pages.some((page) => page.serialNumber !== serialNumber)) {
    throw new Error("parseOggHeaders: multiplexed Ogg streams are not supported");
  }

  const packets = assemblePackets(pages);
  const idPacket = packets[0]?.data;
  if (idPacket === undefined) {
    throw new Error("parseOggHeaders: missing identification packet");
  }

  const codecInfo = decodeIdPacket(idPacket);

  const commentPacket = packets[1];
  if (commentPacket === undefined) {
    throw new Error("parseOggHeaders: missing comment packet");
  }

  const commentBody = decodeCommentPacket(commentPacket.data, codecInfo.codec);
  const vorbisComment = readVorbisComment(commentBody);

  // For Vorbis we also capture the setup packet bytes so the writer can
  // re-attach them after replacing the comment packet.
  const setupPacket = codecInfo.codec === "vorbis" ? packets[2] : undefined;
  if (codecInfo.codec === "vorbis" && setupPacket === undefined) {
    throw new Error("parseOggHeaders: missing Vorbis setup packet");
  }

  // Pages that the writer must replace = comment pages (∪ setup pages for
  // Vorbis), minus the BOS page (sequence 0) which is preserved as-is.
  const headerPageIndices = collectHeaderPageIndices(
    commentPacket.pageIndices,
    setupPacket?.pageIndices,
  );

  return {
    pages,
    serialNumber,
    codecInfo,
    idPacket,
    vorbisComment,
    headerPageIndices,
    vorbisSetupPacket: setupPacket?.data,
  };
};

/**
 * Identify the codec from the first packet of the audio stream.
 *
 * @param packet - First packet bytes (BOS packet payload).
 * @returns Codec info derived from the packet magic.
 * @throws Error when the magic does not match Vorbis or Opus.
 */
const decodeIdPacket = (packet: Uint8Array): OggCodecInfo => {
  if (isVorbisIdPacket(packet)) {
    return parseVorbisIdPacket(packet);
  }

  if (isOpusIdPacket(packet)) {
    return parseOpusIdPacket(packet);
  }

  throw new Error("parseOggHeaders: unsupported codec (only Vorbis and Opus are supported)");
};

/**
 * Strip the codec-specific comment packet prefix and return the inner Vorbis
 * Comment block bytes.
 *
 * @param packet - Comment packet bytes (with codec prefix).
 * @param codec - Codec identifier from the BOS packet.
 * @returns Bytes ready to feed to `readVorbisComment`.
 * @throws Error when the codec prefix is absent.
 */
const decodeCommentPacket = (packet: Uint8Array, codec: OggCodecInfo["codec"]): Uint8Array => {
  if (codec === "vorbis") {
    if (!isVorbisCommentPacket(packet)) {
      throw new Error("parseOggHeaders: comment packet missing Vorbis magic");
    }

    return stripVorbisCommentMagic(packet);
  }

  if (!isOpusCommentPacket(packet)) {
    throw new Error("parseOggHeaders: comment packet missing OpusTags magic");
  }

  return stripOpusCommentMagic(packet);
};

/**
 * Collect the sorted unique page indices that the writer must replace when
 * re-paging the header region.
 *
 * Excludes index `0` because the BOS page (identification packet) is always
 * preserved as-is.
 *
 * @param commentIndices - Page indices that contributed to the comment packet.
 * @param setupIndices - Page indices that contributed to the setup packet (Vorbis only).
 * @returns Sorted unique indices excluding `0`.
 */
const collectHeaderPageIndices = (
  commentIndices: readonly number[],
  setupIndices: readonly number[] | undefined,
): readonly number[] => {
  const merged = new Set<number>(commentIndices);
  if (setupIndices !== undefined) {
    for (const idx of setupIndices) {
      merged.add(idx);
    }
  }

  merged.delete(0);
  return Array.from(merged).sort((a, b) => a - b);
};
