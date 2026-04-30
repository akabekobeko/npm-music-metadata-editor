import { Buffer } from "node:buffer";
import type { WriteOptions } from "../../types.js";
import { findAtom } from "./atom/findAtom.js";
import type { Atom } from "./atom/types.js";
import { buildOffsetRemap, rewriteChunkOffsetAtom } from "./chunkOffset/updateChunkOffsets.js";
import { BOX_HEADER_SIZE, ITUNES_HDLR_PAYLOAD, META_VERSION_FLAGS_SIZE } from "./constants.js";
import { tagToItunesAtoms } from "./itunes/tagFieldToAtom.js";
import { writeIlstPayload } from "./itunes/writeIlst.js";
import { parseMp4 } from "./readMp4.js";
import type { ItunesAtom, ParsedMp4 } from "./types.js";

/** Build a single atom (`size + type + payload`). */
const buildAtom = (type: string, payload: Uint8Array): Uint8Array => {
  const out = Buffer.alloc(BOX_HEADER_SIZE + payload.length);
  out.writeUInt32BE(out.length, 0);
  out.write(type, 4, 4, "latin1");
  Buffer.from(payload).copy(out, BOX_HEADER_SIZE);
  return new Uint8Array(out);
};

/** Concatenate one or more `Uint8Array` chunks into a single buffer. */
const concat = (parts: readonly Uint8Array[]): Uint8Array => {
  const buf = Buffer.concat(parts.map((p) => Buffer.from(p.buffer, p.byteOffset, p.byteLength)));
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
};

/**
 * Slice a child atom out of the source buffer, returning its raw bytes.
 *
 * @param source - The buffer to slice from.
 * @param atom - The atom to extract.
 * @returns A `Uint8Array` view of the atom's bytes.
 */
const sliceAtom = (source: Uint8Array, atom: Atom): Uint8Array =>
  source.subarray(atom.offset, atom.offset + atom.size);

/**
 * Merge the existing ilst atoms with newly-projected ones from the tag.
 *
 * Strategy: replace any atom whose 4-character type is owned by the new tag
 * (matching by exact type — e.g. `©nam`, `trkn`, `covr`); leave everything
 * else (including unrecognised codes and freeform `----` entries we did not
 * handle) untouched. Newly-projected atoms that did not previously exist are
 * appended at the end.
 *
 * @param existing - Atoms parsed from the source file's ilst.
 * @param incoming - Atoms produced from the new tag.
 * @returns The merged atom list in writing order.
 */
const mergeIlstAtoms = (
  existing: readonly ItunesAtom[],
  incoming: readonly ItunesAtom[],
): readonly ItunesAtom[] => {
  const replaceableTypes = new Set(incoming.filter((a) => a.name !== "----").map((a) => a.name));
  // Replaceable freeform entries are matched by `(meanNamespace, meanName)`.
  const replaceableFreeform = new Set(
    incoming
      .filter((a) => a.name === "----")
      .map((a) => `${a.meanNamespace ?? ""}::${a.meanName ?? ""}`),
  );

  const carriedOver = existing.filter((atom) => {
    if (atom.name === "----") {
      const key = `${atom.meanNamespace ?? ""}::${atom.meanName ?? ""}`;
      return !replaceableFreeform.has(key);
    }

    return !replaceableTypes.has(atom.name);
  });

  return [...carriedOver, ...incoming];
};

/**
 * Rebuild the `meta` atom payload with a fresh `hdlr` followed by `ilst`.
 *
 * The `meta` body is `(version+flags) + hdlr + ilst`, matching the canonical
 * iTunes layout.
 *
 * @param ilstPayload - Serialized ilst children (without the box header).
 * @returns The complete `meta` atom bytes (header + payload).
 */
const buildMetaAtom = (ilstPayload: Uint8Array): Uint8Array => {
  const versionFlags = Buffer.alloc(META_VERSION_FLAGS_SIZE);
  const hdlr = buildAtom("hdlr", ITUNES_HDLR_PAYLOAD);
  const ilst = buildAtom("ilst", ilstPayload);
  return buildAtom("meta", concat([new Uint8Array(versionFlags), hdlr, ilst]));
};

/** Arguments for {@link buildUdtaAtom}. */
type BuildUdtaArgs = {
  /** Whole-file bytes. */
  source: Uint8Array;
  /** The original `udta` atom (or `undefined` to build one fresh). */
  udta: Atom | undefined;
  /** The newly built `meta` atom bytes. */
  newMeta: Uint8Array;
};

/**
 * Rebuild the `udta` atom replacing (or inserting) its `meta` child.
 *
 * @returns The complete `udta` atom bytes.
 */
const buildUdtaAtom = ({ source, udta, newMeta }: BuildUdtaArgs): Uint8Array => {
  const otherChildren =
    udta?.children?.filter((c) => c.type !== "meta").map((c) => sliceAtom(source, c)) ?? [];
  return buildAtom("udta", concat([...otherChildren, newMeta]));
};

/** Arguments for {@link buildMoovAtom}. */
type BuildMoovArgs = {
  /** Whole-file bytes. */
  source: Uint8Array;
  /** The original `moov` atom. */
  moov: Atom;
  /** The newly built `udta` atom bytes. */
  newUdta: Uint8Array;
};

/**
 * Rebuild the `moov` atom replacing (or inserting) its `udta` child.
 *
 * @returns The complete `moov` atom bytes.
 */
const buildMoovAtom = ({ source, moov, newUdta }: BuildMoovArgs): Uint8Array => {
  const otherChildren =
    moov.children?.filter((c) => c.type !== "udta").map((c) => sliceAtom(source, c)) ?? [];
  return buildAtom("moov", concat([...otherChildren, newUdta]));
};

/**
 * Reassemble the file with each top-level atom either kept verbatim, replaced
 * (when its `offset` matches `replacedOffset`), or shifted into its new
 * position.
 *
 * @param source - Whole-file bytes.
 * @param tree - Original top-level atoms.
 * @param replacedOffset - Offset of the atom being replaced (typically the
 *   `moov` original offset).
 * @param replacement - Bytes to splice in at `replacedOffset`.
 * @returns The reassembled file bytes (excluding any chunk-offset rewrites).
 */
const reassembleFile = ({
  source,
  tree,
  replacedOffset,
  replacement,
}: {
  source: Uint8Array;
  tree: readonly Atom[];
  replacedOffset: number;
  replacement: Uint8Array;
}): Uint8Array => {
  const parts: Uint8Array[] = [];
  for (const atom of tree) {
    if (atom.offset === replacedOffset) {
      parts.push(replacement);
    } else {
      parts.push(sliceAtom(source, atom));
    }
  }

  return concat(parts);
};

/** Arguments for {@link applyChunkOffsetUpdates}. */
type ApplyArgs = {
  /** The reassembled file bytes (with the new moov in place). */
  rebuilt: Uint8Array;
  /** Original parsed MP4 (used to locate stco / co64 atoms in the new file). */
  parsed: ParsedMp4;
  /** Old moov offset / size, plus the new moov size. */
  moovChange: { offset: number; oldSize: number; newSize: number };
};

/**
 * Apply the chunk-offset rewrites to the rebuilt file in place.
 *
 * Each `stco` / `co64` atom inside the new `moov` is located by walking the
 * rebuilt buffer's atom tree, then rewritten with the offset remap derived
 * from the `moov` size delta.
 *
 * @returns A new buffer with the chunk-offset rewrites applied.
 */
const applyChunkOffsetUpdates = ({ rebuilt, parsed, moovChange }: ApplyArgs): Uint8Array => {
  if (parsed.chunkOffsetAtoms.length === 0) {
    return rebuilt;
  }

  const remap = buildOffsetRemap({
    changedAtomOffset: moovChange.offset,
    changedAtomOldSize: moovChange.oldSize,
    changedAtomNewSize: moovChange.newSize,
  });

  // Re-parse the rebuilt file so we can locate the new offsets of every
  // stco / co64 atom (their position has shifted because moov grew).
  const newParsed = parseMp4(rebuilt);
  const out = Buffer.from(rebuilt);
  for (const atom of newParsed.chunkOffsetAtoms) {
    const updated = rewriteChunkOffsetAtom({ source: rebuilt, atom, remap });
    Buffer.from(updated).copy(out, atom.offset);
  }

  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

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
