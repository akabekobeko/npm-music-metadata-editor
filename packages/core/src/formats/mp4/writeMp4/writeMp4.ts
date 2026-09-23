import { lyricsToMp4Lyr } from "../../../extras/lyrics/converters/lyricsToMp4Lyr.js";
import type { TagData, WriteOptions } from "../../../types.js";
import { fillNumberPairs } from "../../../utils/tagPatch/fillNumberPairs.js";
import { findAtom } from "../atom/findAtom.js";
import { tagToItunesAtoms } from "../itunes/tagToItunesAtoms/tagToItunesAtoms.js";
import { tombstoneAtom } from "../itunes/tagToItunesAtoms/tombstoneAtom.js";
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
 *    with the file's existing entries to preserve unknown atoms. Fields set
 *    to `null` / `""` become tombstones that `mergeIlstAtoms` turns into
 *    deletions. When `options.pictures` / `options.lyrics` is supplied,
 *    replace any existing `covr` / `©lyr` atoms with synthesized ones; an
 *    empty pictures array (or lyrics with no text) drops the existing atom
 *    entirely via the same tombstone mechanism.
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

  const incoming = collectIncomingAtoms({ options, existingTag: parsed.metadata.tag });
  const merged = mergeIlstAtoms(parsed.metadata.ilstAtoms, incoming);

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

/** Arguments for {@link collectIncomingAtoms}. */
type CollectArgs = {
  /** User-supplied write options. */
  options: WriteOptions;
  /** Tag fields decoded from the source file's ilst. */
  existingTag: TagData;
};

/**
 * Build the list of ilst atoms to splice in:
 * - `tagToItunesAtoms` projects the tag fields (and `covr` when pictures are supplied).
 *   Half-specified `trkn` / `disk` pairs are completed from `existingTag`
 *   first (see {@link fillNumberPairs}) because both halves share one atom.
 * - {@link lyricsToMp4Lyr} appends `©lyr` when lyrics are supplied; lyrics
 *   that resolve to no atom yield a `©lyr` tombstone so the existing frame
 *   is dropped.
 *
 * @returns Atoms to merge into the existing ilst list.
 */
const collectIncomingAtoms = ({ options, existingTag }: CollectArgs): ItunesAtom[] => {
  const tag = fillNumberPairs({ patch: options.tag, existing: existingTag });
  const out: ItunesAtom[] = [...tagToItunesAtoms({ tag, pictures: options.pictures })];
  if (options.lyrics !== undefined) {
    out.push(lyricsToMp4Lyr(options.lyrics) ?? tombstoneAtom({ name: "©lyr" }));
  }

  return out;
};
