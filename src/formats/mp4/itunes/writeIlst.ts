import { Buffer } from "node:buffer";
import { BOX_HEADER_SIZE, DEFAULT_FREEFORM_NAMESPACE } from "../constants.js";
import type { ItunesAtom, ItunesDataValue } from "../types.js";

/** Bytes consumed by the FullBox version+flags prefix on `mean` / `name`. */
const FULLBOX_PREFIX_SIZE = 4;
/** Bytes consumed by `data` atom's `(typeIndicator, locale)` prefix. */
const DATA_PREFIX_SIZE = 8;

/**
 * Write a single atom as `size + type + payload`.
 *
 * @param type - 4-character atom type (Latin-1).
 * @param payload - Atom payload bytes.
 * @returns The encoded box including its 8-byte header.
 */
const writeBox = (type: string, payload: Uint8Array): Uint8Array => {
  const total = BOX_HEADER_SIZE + payload.length;
  const out = Buffer.alloc(total);
  out.writeUInt32BE(total, 0);
  out.write(type, 4, 4, "latin1");
  Buffer.from(payload).copy(out, 8);
  return new Uint8Array(out);
};

/**
 * Serialize one `data` value into a complete `data` atom.
 *
 * @param value - The value to encode.
 * @returns The encoded box bytes.
 */
const writeDataAtom = (value: ItunesDataValue): Uint8Array => {
  const payload = Buffer.alloc(DATA_PREFIX_SIZE + value.data.length);
  payload.writeUInt32BE(value.typeIndicator & 0x00ffffff, 0);
  payload.writeUInt32BE(value.locale, 4);
  Buffer.from(value.data).copy(payload, DATA_PREFIX_SIZE);
  return writeBox("data", new Uint8Array(payload));
};

/**
 * Serialize a `mean` or `name` FullBox carrying an ASCII string.
 *
 * @param type - `"mean"` or `"name"`.
 * @param text - The string payload (Latin-1 / ASCII; not null-terminated).
 * @returns The encoded box bytes.
 */
const writeFullBoxString = (type: string, text: string): Uint8Array => {
  const stringBytes = Buffer.from(text, "latin1");
  const payload = Buffer.alloc(FULLBOX_PREFIX_SIZE + stringBytes.length);
  // Version + flags = 0
  payload.writeUInt32BE(0, 0);
  stringBytes.copy(payload, FULLBOX_PREFIX_SIZE);
  return writeBox(type, new Uint8Array(payload));
};

/**
 * Serialize one ilst child atom (`©nam`, `trkn`, `----`, …) including its
 * `data` (and, for `----`, `mean` / `name`) sub-atoms.
 *
 * @param atom - The structured atom to encode.
 * @returns The encoded box bytes.
 */
const writeItunesAtom = (atom: ItunesAtom): Uint8Array => {
  const parts: Uint8Array[] = [];
  if (atom.name === "----") {
    parts.push(writeFullBoxString("mean", atom.meanNamespace ?? DEFAULT_FREEFORM_NAMESPACE));
    parts.push(writeFullBoxString("name", atom.meanName ?? ""));
  }

  for (const value of atom.values) {
    parts.push(writeDataAtom(value));
  }

  return writeBox(atom.name, Buffer.concat(parts));
};

/**
 * Serialize the contents of an `ilst` atom (children only, *not* including
 * the `ilst` box header itself).
 *
 * @param atoms - The structured atom list to encode.
 * @returns The serialized payload bytes.
 */
export const writeIlstPayload = (atoms: readonly ItunesAtom[]): Uint8Array => {
  const parts = atoms.map(writeItunesAtom);
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = Buffer.alloc(total);
  let offset = 0;
  for (const part of parts) {
    Buffer.from(part).copy(out, offset);
    offset += part.length;
  }

  return new Uint8Array(out);
};
