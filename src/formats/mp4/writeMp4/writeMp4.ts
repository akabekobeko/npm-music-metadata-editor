import type { WriteOptions } from "../../../types.js";
import { findAtom } from "../atom/findAtom.js";
import { tagToItunesAtoms } from "../itunes/tagFieldToAtom.js";
import { writeIlstPayload } from "../itunes/writeIlst.js";
import { parseMp4 } from "../readMp4.js";
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
 *    with the file's existing entries to preserve unknown atoms.
 * 3. Rebuild `moov/udta/meta/ilst` from the merged list, then assemble the
 *    new file with the rebuilt `moov` in place of the original.
 * 4. Update every `stco` / `co64` entry by the moov size delta so the audio
 *    frames inside `mdat` continue to be addressable.
 *
 * @param source - Original file bytes.
 * @param options - {@link WriteOptions} carrying the tag fields and pictures
 *   to embed.
 * @returns The rebuilt file bytes.
 * @throws when the source has no `moov` (an unrecoverable structural error).
 */
export const writeMp4 = async (source: Uint8Array, options: WriteOptions): Promise<Uint8Array> => {
  const parsed = parseMp4(source);
  if (parsed.moov === undefined) {
    throw new Error("writeMp4: source has no moov atom");
  }

  const incoming = tagToItunesAtoms({
    tag: options.tag,
    // Phase 4 leaves picture editing for Phase 9; keep existing pictures
    // verbatim by *not* projecting them through `tagToItunesAtoms` here.
    pictures: undefined,
  });
  const merged = mergeIlstAtoms(parsed.metadata.ilstAtoms, incoming);

  const ilstPayload = writeIlstPayload(merged);
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
