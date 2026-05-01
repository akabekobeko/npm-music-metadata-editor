import { BOX_HEADER_SIZE, LARGE_BOX_HEADER_SIZE } from "../../constants.js";
import type { Atom } from "../types.js";
import { decodeType } from "./decodeType.js";
import { detectMetaChildStart } from "./detectMetaChildStart.js";
import { isContainerAtom } from "./isContainerAtom.js";
import { readUInt32 } from "./readUInt32.js";
import { readUInt64 } from "./readUInt64.js";

/** Arguments for {@link parseRange}. */
type Args = {
  /** Source buffer. */
  source: Uint8Array;
  /** Absolute offset where parsing begins. */
  start: number;
  /** Absolute offset where parsing must stop (exclusive). */
  end: number;
  /** Type of the parent atom (drives `ilst` / `meta` special cases). */
  parentType?: string;
};

/**
 * Parse a contiguous range of the source buffer as a sequence of sibling
 * atoms. Each call recurses into containers via {@link resolveChildren}; leaf
 * atoms (or atoms past the range boundary) are returned without a `children`
 * field.
 *
 * @returns The parsed sibling atoms in file order.
 * @throws when an atom claims a size that extends past `end`, or when the
 *   declared size is smaller than the header.
 */
export const parseRange = ({ source, start, end, parentType }: Args): readonly Atom[] => {
  const atoms: Atom[] = [];
  let pos = start;
  while (pos + BOX_HEADER_SIZE <= end) {
    const declaredSize = readUInt32(source, pos);
    const type = decodeType(source, pos + 4);

    let headerSize = BOX_HEADER_SIZE;
    let size: number;
    if (declaredSize === 1) {
      // Extended size: read the 64-bit `largesize` that follows the type.
      if (pos + LARGE_BOX_HEADER_SIZE > end) {
        throw new Error(
          `parseAtomTree: atom "${type}" at offset ${pos} declares extended size but header is truncated`,
        );
      }

      const big = readUInt64(source, pos + BOX_HEADER_SIZE);
      if (big > Number.MAX_SAFE_INTEGER) {
        throw new Error(
          `parseAtomTree: atom "${type}" at offset ${pos} has size ${big} exceeding MAX_SAFE_INTEGER`,
        );
      }

      size = Number(big);
      headerSize = LARGE_BOX_HEADER_SIZE;
    } else if (declaredSize === 0) {
      // Size 0 means "extends to end of file" per ISO BMFF.
      size = end - pos;
    } else {
      size = declaredSize;
    }

    if (size < headerSize) {
      throw new Error(
        `parseAtomTree: atom "${type}" at offset ${pos} declares size ${size} smaller than header ${headerSize}`,
      );
    }

    if (pos + size > end) {
      throw new Error(
        `parseAtomTree: atom "${type}" at offset ${pos} (size ${size}) extends past parent end ${end}`,
      );
    }

    const payloadOffset = pos + headerSize;
    const payloadSize = size - headerSize;
    const children = resolveChildren({ source, type, parentType, payloadOffset, payloadSize });

    atoms.push({
      type,
      offset: pos,
      size,
      headerSize,
      payloadOffset,
      payloadSize,
      ...(children === undefined ? {} : { children }),
    });

    pos += size;
  }

  return atoms;
};

/** Arguments for {@link resolveChildren}. */
type ResolveArgs = {
  /** Source buffer. */
  source: Uint8Array;
  /** Type of the atom whose children we are resolving. */
  type: string;
  /** Type of the parent atom (used to recognise `ilst` children). */
  parentType: string | undefined;
  /** Absolute offset where the atom's payload starts. */
  payloadOffset: number;
  /** Length of the payload in bytes. */
  payloadSize: number;
};

/**
 * Decide whether an atom's payload should be parsed as a list of children,
 * and if so, where the child range begins.
 *
 * - Plain container atoms (`moov`, `trak`, …) recurse over the whole payload.
 * - `meta` skips an optional 4-byte version+flags prefix when present.
 * - Children of `ilst` (e.g. `©nam`, `trkn`, `----`) recurse into their
 *   `data` / `mean` / `name` sub-atoms.
 * - Everything else is treated as a leaf.
 *
 * Co-located with {@link parseRange} because the two are mutually recursive
 * — the cycle is intrinsic to atom-tree parsing, so splitting them across
 * files would only hide the dependency rather than break it.
 *
 * @returns The parsed children, or `undefined` when the atom is a leaf.
 */
const resolveChildren = ({
  source,
  type,
  parentType,
  payloadOffset,
  payloadSize,
}: ResolveArgs): readonly Atom[] | undefined => {
  if (isContainerAtom(type)) {
    return parseRange({
      source,
      start: payloadOffset,
      end: payloadOffset + payloadSize,
      parentType: type,
    });
  }

  if (type === "meta") {
    const childStart = detectMetaChildStart({ source, payloadOffset, payloadSize });
    return parseRange({
      source,
      start: childStart,
      end: payloadOffset + payloadSize,
      parentType: type,
    });
  }

  if (parentType === "ilst") {
    // Every direct child of `ilst` is itself a container of `data` / `mean` /
    // `name` sub-atoms.
    return parseRange({
      source,
      start: payloadOffset,
      end: payloadOffset + payloadSize,
      parentType: type,
    });
  }

  return undefined;
};
