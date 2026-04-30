import { Buffer } from "node:buffer";

/** Minimum bytes required to inspect an `ftyp` brand. */
const MIN_FTYP_HEADER_SIZE = 12;

/**
 * Return `true` when `header` starts with an MP4 (ISO BMFF) `ftyp` box.
 *
 * MP4 / M4A / M4B / 3GP all share the same outer container — they only
 * differ by the brand encoded inside `ftyp`. We therefore accept any file
 * whose first box is `ftyp`; brand-specific routing happens later in
 * {@link resolveMp4AudioFormat}.
 *
 * @param header - Leading bytes of the file (typically up to 64 bytes).
 * @returns `true` when the leading box is `ftyp`.
 */
export const detectMp4Signature = (header: Uint8Array): boolean => {
  if (header.length < MIN_FTYP_HEADER_SIZE) {
    return false;
  }

  const view = Buffer.from(header.buffer, header.byteOffset, header.byteLength);
  const size = view.readUInt32BE(0);
  if (size < MIN_FTYP_HEADER_SIZE) {
    return false;
  }

  return view.toString("latin1", 4, 8) === "ftyp";
};
