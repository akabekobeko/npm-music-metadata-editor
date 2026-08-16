/**
 * Atom types that legitimately appear at the top level of an MP4 / QuickTime
 * file (ISO BMFF boxes plus the QuickTime additions `wide` / `skip` / `pnot`).
 * `uuid` covers vendor extensions, so any real top-level atom is expected to
 * match this list.
 */
const KNOWN_TOP_LEVEL_ATOM_TYPES: ReadonlySet<string> = new Set([
  "ftyp",
  "styp",
  "moov",
  "moof",
  "mfra",
  "mdat",
  "meta",
  "free",
  "skip",
  "wide",
  "pdin",
  "pnot",
  "sidx",
  "ssix",
  "prft",
  "emsg",
  "uuid",
]);

/**
 * Judge whether a 4-character code decoded from a top-level box header is a
 * known top-level atom type.
 *
 * Used to distinguish trailing garbage (e.g. leftovers of an in-place tag
 * rewrite that shrank the file's content without truncating it) from a
 * genuinely truncated atom. Garbage bytes decode to an arbitrary 4-character
 * code — sometimes even printable ASCII by chance — but virtually never to one
 * of the registered top-level types, so only a match keeps the strict error
 * path.
 *
 * @param type - 4-character type decoded as Latin-1.
 * @returns `true` when the code is a registered top-level atom type.
 */
export const isKnownTopLevelAtomType = (type: string): boolean =>
  KNOWN_TOP_LEVEL_ATOM_TYPES.has(type);
