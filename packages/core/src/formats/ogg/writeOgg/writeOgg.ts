import { Buffer } from "node:buffer";
import {
  buildVorbisCommentExtras,
  MANAGED_EXTRA_KEYS,
} from "../../../extras/vorbisCommentExtras/buildVorbisCommentExtras.js";
import { tagDataToVorbisComment } from "../../../tags/vorbisComment/tagDataToVorbisComment/tagDataToVorbisComment.js";
import type { VorbisCommentEntry } from "../../../tags/vorbisComment/types.js";
import type { WriteOptions } from "../../../types.js";
import { parseOggHeaders } from "../readOgg/parseOggHeaders.js";
import type { OggPage } from "../types.js";
import { buildCommentPacket } from "./buildCommentPacket.js";
import { buildHeaderPages } from "./buildHeaderPages.js";
import { renumberTrailingPages } from "./renumberTrailingPages.js";

/** Default vendor string used when the source file did not carry one. */
const DEFAULT_VENDOR = "music-metadata-editor";

/**
 * Rewrite an Ogg file (Vorbis or Opus) with new metadata.
 *
 * Strategy (mirrors ATL.NET's `Ogg.WriteAsync`):
 * 1. Parse the source pages and extract the existing comment / Vorbis setup
 *    packet bytes.
 * 2. Build a fresh comment packet with the merged tag.
 * 3. Re-page `[comment, setup?]` starting at sequence 1 (the BOS page keeps
 *    sequence 0).
 * 4. Splice the rebuilt header pages between the BOS page and the audio
 *    pages.
 * 5. Renumber & recompute CRC for trailing audio pages so the sequence
 *    remains contiguous.
 *
 * @param input - Original file bytes.
 * @param options - {@link WriteOptions} carrying the tag to merge in.
 * @returns Rebuilt file bytes ready to persist.
 */
export const writeOgg = async (input: Uint8Array, options: WriteOptions): Promise<Uint8Array> => {
  const parsed = parseOggHeaders(input);

  const vendor = parsed.vorbisComment.vendor === "" ? DEFAULT_VENDOR : parsed.vorbisComment.vendor;
  const preserveEntries = filterPreservedExtras({
    entries: parsed.vorbisComment.comments,
    overridePictures: options.pictures !== undefined,
    overrideLyrics: options.lyrics !== undefined,
  });
  const extraEntries = buildVorbisCommentExtras({
    pictures: options.pictures,
    lyrics: options.lyrics,
  });
  const newComment = tagDataToVorbisComment({
    tag: options.tag,
    vendor,
    preserveEntries: [...preserveEntries, ...extraEntries],
  });
  const commentPacket = buildCommentPacket(newComment, parsed.codecInfo.codec);

  const packets: Uint8Array[] =
    parsed.vorbisSetupPacket === undefined
      ? [commentPacket]
      : [commentPacket, parsed.vorbisSetupPacket];

  // BOS page already carries sequence 0; new header pages start at 1.
  const newHeaderPages = buildHeaderPages({
    packets,
    serialNumber: parsed.serialNumber,
    startPageSequence: 1,
  });

  // Layout: [BOS page bytes] + [new header pages] + [renumbered trailing pages].
  const bosPageEnd = bosPageEndOffset(parsed.pages);
  const skipIndices = new Set<number>([0, ...parsed.headerPageIndices]);
  const trailingPages = parsed.pages.filter((_page, index) => !skipIndices.has(index));
  const trailingBytes = renumberTrailingPages({
    source: input,
    pages: trailingPages,
    startPageSequence: newHeaderPages.length + 1,
    serialNumber: parsed.serialNumber,
  });

  const total = Buffer.concat([input.subarray(0, bosPageEnd), ...newHeaderPages, trailingBytes]);
  return new Uint8Array(total.buffer, total.byteOffset, total.byteLength);
};

/** Arguments for {@link filterPreservedExtras}. */
type FilterArgs = {
  /** Source entries (the existing Vorbis Comment). */
  entries: readonly VorbisCommentEntry[];
  /** `true` when `options.pictures` is set — drops `METADATA_BLOCK_PICTURE`. */
  overridePictures: boolean;
  /** `true` when `options.lyrics` is set — drops the lyrics aliases. */
  overrideLyrics: boolean;
};

/**
 * Drop entries the writer is about to re-emit so the output never carries
 * stale duplicates of the synthesized extras.
 *
 * @returns The filtered entry list, in source order.
 */
const filterPreservedExtras = ({
  entries,
  overridePictures,
  overrideLyrics,
}: FilterArgs): VorbisCommentEntry[] => {
  if (!overridePictures && !overrideLyrics) {
    return [...entries];
  }

  const dropKeys = new Set<string>();
  for (const key of MANAGED_EXTRA_KEYS) {
    const isPictureKey = key === "METADATA_BLOCK_PICTURE";
    if ((isPictureKey && overridePictures) || (!isPictureKey && overrideLyrics)) {
      dropKeys.add(key);
    }
  }

  return entries.filter((entry) => !dropKeys.has(entry.key.toUpperCase()));
};

/**
 * Return the byte offset where the BOS page ends, i.e. where the rebuilt
 * comment header pages should start.
 *
 * @param pages - All pages parsed from the input file.
 * @returns Absolute end offset of the BOS page.
 */
const bosPageEndOffset = (pages: readonly OggPage[]): number => {
  const bos = pages[0];
  if (bos === undefined) {
    throw new Error("writeOgg: missing BOS page");
  }

  return bos.pageStart + bos.pageSize;
};
