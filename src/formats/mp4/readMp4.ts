import { Buffer } from "node:buffer";
import type { AudioFormat, MetadataReadResult } from "../../types.js";
import { findAllAtoms } from "./atom/findAllAtoms.js";
import { findAtom } from "./atom/findAtom.js";
import { parseAtomTree } from "./atom/parseAtomTree.js";
import type { Atom } from "./atom/types.js";
import { atomsToTagFields } from "./itunes/atomToTagField.js";
import { readIlst } from "./itunes/readIlst.js";
import type { ItunesAtom, ParsedMp4 } from "./types.js";

/**
 * Walk the tree to locate the `ilst` atom inside `moov/udta/meta` (the
 * canonical iTunes location). Returns `undefined` when the file contains no
 * such metadata region.
 *
 * @param tree - Top-level atoms parsed from the file.
 * @returns The `ilst` atom, or `undefined` when not present.
 */
const locateIlst = (tree: readonly Atom[]): Atom | undefined =>
  findAtom(tree, ["moov", "udta", "meta", "ilst"]);

/**
 * Read the brand list at the start of the file's `ftyp` atom.
 *
 * @param source - Whole-file bytes.
 * @param tree - Top-level atoms.
 * @returns The major brand + compatible brands found in `ftyp`, or an empty
 *   list when the atom is missing or malformed.
 */
const readBrands = (source: Uint8Array, tree: readonly Atom[]): readonly string[] => {
  const ftyp = tree.find((atom) => atom.type === "ftyp");
  if (ftyp === undefined || ftyp.payloadSize < 8) {
    return [];
  }

  const view = Buffer.from(source.buffer, source.byteOffset + ftyp.payloadOffset, ftyp.payloadSize);
  // major_brand (4) + minor_version (4) + N * compatible_brands (4)
  const major = view.toString("latin1", 0, 4);
  const compatible: string[] = [];
  for (let pos = 8; pos + 4 <= view.length; pos += 4) {
    compatible.push(view.toString("latin1", pos, pos + 4));
  }

  return [major, ...compatible];
};

/**
 * Decide which {@link AudioFormat} to surface for a parsed MP4 file based on
 * the `ftyp` brand list.
 *
 * iTunes Audio (`M4A `) and Audio Books (`M4B `) map to `"m4a"` so callers
 * can distinguish audio-only containers; everything else (`isom`, `mp42`,
 * etc.) maps to `"mp4"`.
 *
 * @param brands - Brand strings extracted from `ftyp`.
 * @returns `"m4a"` for iTunes audio variants, `"mp4"` otherwise.
 */
export const resolveMp4AudioFormat = (brands: readonly string[]): AudioFormat => {
  const audioBrands = new Set(["M4A ", "M4B ", "M4P ", "M4V ", "M4VP", "M4VH"]);
  return brands.some((b) => audioBrands.has(b)) ? "m4a" : "mp4";
};

/**
 * Parse an MP4 file's atom tree and metadata region.
 *
 * @param source - Whole-file bytes.
 * @returns The parsed tree plus extracted iTunes metadata.
 */
export const parseMp4 = (source: Uint8Array): ParsedMp4 => {
  const tree = parseAtomTree(source);
  const moov = tree.find((atom) => atom.type === "moov");
  const ilst = locateIlst(tree);

  const ilstAtoms: readonly ItunesAtom[] = ilst === undefined ? [] : readIlst({ source, ilst });
  const { tag, pictures } = atomsToTagFields(ilstAtoms);

  const chunkOffsetAtoms: readonly Atom[] = [
    ...findAllAtoms(tree, "stco"),
    ...findAllAtoms(tree, "co64"),
  ];

  return {
    tree,
    moov,
    chunkOffsetAtoms,
    metadata: {
      tag,
      pictures,
      ilstAtoms,
      ...(ilst === undefined ? {} : { ilst }),
    },
  };
};

/**
 * Read MP4 / M4A metadata.
 *
 * Parses the atom tree, projects the iTunes ilst entries onto our common
 * {@link MetadataReadResult} shape, and surfaces the detected brand-derived
 * audio format. The audio data inside `mdat` is not touched.
 *
 * @param source - Whole-file bytes.
 * @returns A {@link MetadataReadResult} populated from the iTunes metadata.
 */
export const readMp4 = async (source: Uint8Array): Promise<MetadataReadResult> => {
  const parsed = parseMp4(source);
  const brands = readBrands(source, parsed.tree);
  return {
    audioFormat: resolveMp4AudioFormat(brands),
    tag: parsed.metadata.tag,
    pictures: parsed.metadata.pictures,
    chapters: [],
  };
};
