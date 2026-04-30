import { Buffer } from "node:buffer";
import {
  BOX_HEADER_SIZE,
  CONTAINER_ATOM_TYPES,
  LARGE_BOX_HEADER_SIZE,
  META_VERSION_FLAGS_SIZE,
} from "../constants.js";
import type { Atom } from "./types.js";

/** Maximum byte length of an `Atom.type` string. */
const TYPE_LENGTH = 4;

/**
 * Decode 4 bytes as the ASCII / Latin-1 atom type. Atom types include
 * non-ASCII bytes (e.g. `"©nam"` whose first byte is `0xA9`); decoding via
 * Latin-1 keeps the round-trip lossless.
 *
 * @param source - Source buffer.
 * @param offset - Absolute offset of the 4 bytes to decode.
 * @returns 4-character atom type string.
 */
const decodeType = (source: Uint8Array, offset: number): string =>
  Buffer.from(source.buffer, source.byteOffset + offset, TYPE_LENGTH).toString("latin1");

/**
 * Decide whether `type` is a container that should be recursively parsed.
 * The `meta` atom is handled separately (it carries a 4-byte version+flags
 * prefix), so it is not part of {@link CONTAINER_ATOM_TYPES} and returns
 * `false` here.
 *
 * @param type - 4-character atom type code.
 * @returns `true` for plain container atoms, `false` for leaves and `meta`.
 */
const isContainerAtom = (type: string): boolean => CONTAINER_ATOM_TYPES.includes(type);

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
 * atoms. Each call recurses into containers. Leaf atoms (or atoms past the
 * range boundary) are returned without a `children` field.
 *
 * @returns The parsed sibling atoms in file order.
 * @throws when an atom claims a size that extends past `end`, or when the
 *   declared size is smaller than the header.
 */
const parseRange = ({ source, start, end, parentType }: Args): readonly Atom[] => {
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
    // QuickTime files sometimes omit the FullBox version+flags prefix. The
    // first 4 bytes either match a child header or contain the 0x00000000
    // version/flags pattern; we probe by checking whether bytes 0..3 form a
    // plausible child size.
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

/** Arguments for {@link detectMetaChildStart}. */
type DetectArgs = {
  /** Source buffer. */
  source: Uint8Array;
  /** Absolute offset where the `meta` payload starts. */
  payloadOffset: number;
  /** Length of the `meta` payload. */
  payloadSize: number;
};

/**
 * Probe a `meta` atom's payload to figure out where its children begin.
 *
 * If the first 4 bytes are a plausible atom size (8 ≤ size ≤ remaining), we
 * assume the box is the QuickTime variant *without* a version/flags prefix.
 * Otherwise the box is treated as a FullBox and the prefix is skipped.
 */
const detectMetaChildStart = ({ source, payloadOffset, payloadSize }: DetectArgs): number => {
  if (payloadSize < BOX_HEADER_SIZE) {
    return payloadOffset;
  }

  const firstSize = readUInt32(source, payloadOffset);
  const looksLikeChildHeader = firstSize >= BOX_HEADER_SIZE && firstSize <= payloadSize;
  if (looksLikeChildHeader) {
    return payloadOffset;
  }

  return payloadOffset + META_VERSION_FLAGS_SIZE;
};

/**
 * Read a 32-bit big-endian unsigned integer at `offset`.
 *
 * @param source - Source buffer.
 * @param offset - Absolute offset to read from.
 * @returns The decoded value in `[0, 0xFFFFFFFF]`.
 */
const readUInt32 = (source: Uint8Array, offset: number): number =>
  Buffer.from(source.buffer, source.byteOffset + offset, 4).readUInt32BE(0);

/**
 * Read a 64-bit big-endian unsigned integer at `offset` as a `bigint`.
 *
 * @param source - Source buffer.
 * @param offset - Absolute offset to read from.
 * @returns The decoded value as a `bigint`.
 */
const readUInt64 = (source: Uint8Array, offset: number): bigint =>
  Buffer.from(source.buffer, source.byteOffset + offset, 8).readBigUInt64BE(0);

/**
 * Parse the top-level atom tree of an MP4 file.
 *
 * Walks `source` from offset 0, recursing into the container atoms listed in
 * {@link CONTAINER_ATOM_TYPES} as well as `meta` and `ilst` children. Leaf
 * atoms (e.g. `mdat`, `stco`, `data`) keep their bytes inside the buffer; the
 * caller can `subarray(payloadOffset, payloadOffset + payloadSize)` on demand.
 *
 * @param source - Whole-file bytes.
 * @returns Top-level atoms in file order.
 * @throws when a box header is truncated or an atom extends past its parent.
 */
export const parseAtomTree = (source: Uint8Array): readonly Atom[] =>
  parseRange({ source, start: 0, end: source.length });
