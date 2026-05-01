import { lyricsToMp4Lyr } from "../../../extras/lyrics/converters/lyricsToMp4Lyr.js";
import type { WriteOptions } from "../../../types.js";
import { findAtom } from "../atom/findAtom.js";
import { tagToItunesAtoms } from "../itunes/tagToItunesAtoms/tagToItunesAtoms.js";
import { writeIlst } from "../itunes/writeIlst/writeIlst.js";
import { parseMp4 } from "../readMp4/parseMp4.js";
import type { ItunesAtom } from "../types.js";
import { applyChunkOffsetUpdates } from "./applyChunkOffsetUpdates.js";
import { buildMetaAtom } from "./buildMetaAtom.js";
import { buildMoovAtom } from "./buildMoovAtom.js";
import { buildUdtaAtom } from "./buildUdtaAtom.js";
import { mergeIlstAtoms } from "./mergeIlstAtoms.js";
import { reassembleFile } from "./reassembleFile.js";

/**
 * Rewrite an MP4 file with new metadata.
 *
 * Strategy:
 * 1. Parse the original file to locate `moov`, the existing ilst atoms, and
 *    every chunk-offset atom (`stco` / `co64`).
 * 2. Project the requested tag onto the canonical iTunes ilst form, merging
 *    with the file's existing entries to preserve unknown atoms. When
 *    `options.pictures` / `options.lyrics` is supplied, replace any existing
 *    `covr` / `©lyr` atoms with synthesized ones; an empty pictures array
 *    drops the existing cover art entirely.
 * 3. Rebuild `moov/udta/meta/ilst` from the merged list, then assemble the
 *    new file with the rebuilt `moov` in place of the original.
 * 4. Update every `stco` / `co64` entry by the moov size delta so the audio
 *    frames inside `mdat` continue to be addressable.
 *
 * @param source - Original file bytes.
 * @param options - {@link WriteOptions} carrying the tag fields plus optional
 *   pictures / lyrics to embed.
 * @returns The rebuilt file bytes.
 * @throws when the source has no `moov` (an unrecoverable structural error).
 */
export const writeMp4 = async (source: Uint8Array, options: WriteOptions): Promise<Uint8Array> => {
  const parsed = parseMp4(source);
  if (parsed.moov === undefined) {
    throw new Error("writeMp4: source has no moov atom");
  }

  const incoming = collectIncomingAtoms(options);
  const filteredExisting = filterExistingExtras({
    existing: parsed.metadata.ilstAtoms,
    overridePictures: options.pictures !== undefined,
    overrideLyrics: options.lyrics !== undefined,
  });
  const merged = mergeIlstAtoms(filteredExisting, incoming);

  const ilstPayload = writeIlst(merged);
  const newMeta = buildMetaAtom(ilstPayload);
  const udta = findAtom(parsed.tree, ["moov", "udta"]);
  const newUdta = buildUdtaAtom({ source, udta, newMeta });
  const newMoov = buildMoovAtom({ source, moov: parsed.moov, newUdta });

  const rebuilt = reassembleFile({
    source,
    tree: parsed.tree,
    replacedOffset: parsed.moov.offset,
    replacement: newMoov,
  });

  return applyChunkOffsetUpdates({
    rebuilt,
    parsed,
    moovChange: {
      offset: parsed.moov.offset,
      oldSize: parsed.moov.size,
      newSize: newMoov.length,
    },
  });
};

/**
 * Build the list of ilst atoms to splice in:
 * - `tagToItunesAtoms` projects the tag fields (and `covr` when pictures are supplied).
 * - {@link lyricsToMp4Lyr} appends `©lyr` when lyrics are supplied.
 *
 * @param options - User-supplied write options.
 * @returns Atoms to merge into the existing ilst list.
 */
const collectIncomingAtoms = (options: WriteOptions): ItunesAtom[] => {
  const out: ItunesAtom[] = [...tagToItunesAtoms({ tag: options.tag, pictures: options.pictures })];
  if (options.lyrics !== undefined) {
    const lyr = lyricsToMp4Lyr(options.lyrics);
    if (lyr !== undefined) {
      out.push(lyr);
    }
  }

  return out;
};

/** Arguments for {@link filterExistingExtras}. */
type FilterArgs = {
  /** Pre-existing ilst atoms parsed from the source file. */
  existing: readonly ItunesAtom[];
  /** `true` when the writer is replacing pictures (drops `covr`). */
  overridePictures: boolean;
  /** `true` when the writer is replacing lyrics (drops `©lyr`). */
  overrideLyrics: boolean;
};

/**
 * Drop existing atoms the writer is about to fully replace.
 *
 * The iTunes `mergeIlstAtoms` already replaces atoms whose 4-character type
 * is repeated by the incoming list. The extra filter here only matters when
 * the caller supplies an *empty* pictures array (or a lyrics override that
 * resolves to no atom): without it the existing `covr` / `©lyr` would carry
 * through, defeating the deletion intent.
 *
 * @returns The filtered atom list, in source order.
 */
const filterExistingExtras = ({
  existing,
  overridePictures,
  overrideLyrics,
}: FilterArgs): readonly ItunesAtom[] => {
  if (!overridePictures && !overrideLyrics) {
    return existing;
  }

  return existing.filter((atom) => {
    if (overridePictures && atom.name === "covr") {
      return false;
    }

    if (overrideLyrics && atom.name === "©lyr") {
      return false;
    }

    return true;
  });
};
