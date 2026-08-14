import { Buffer } from "node:buffer";

/** ID3v2.2 `PIC` 3-character image formats mapped to MIME types. */
const MIME_BY_FORMAT: Readonly<Record<string, string>> = {
  PNG: "image/png",
  JPG: "image/jpeg",
  GIF: "image/gif",
  BMP: "image/bmp",
  TIF: "image/tiff",
};

/**
 * Rewrite an ID3v2.2 `PIC` frame body into the v2.3 `APIC` layout.
 *
 * PIC layout: `<encoding:1><imageFormat:3><kind:1><description:term><data>`.
 * APIC layout: `<encoding:1><mime:Latin1+\0><kind:1><description:term><data>`.
 *
 * Only the 3-character image format needs translation into a NUL-terminated
 * MIME string; everything after it is copied verbatim. `"-->"` (linked
 * picture) is kept as-is because APIC uses the same sentinel. Unknown formats
 * become `image/<format>` so no information is dropped.
 *
 * @param body - Raw PIC frame body.
 * @returns The equivalent APIC body, or `body` unchanged when it is too short
 *   to carry the PIC fixed fields (downstream parsers reject it either way).
 */
export const convertPicBodyToApicBody = (body: Uint8Array): Uint8Array => {
  if (body.length < 5) {
    return body;
  }

  const format = Buffer.from(body.subarray(1, 4))
    .toString("latin1")
    .replace(/[\0 ]+$/, "");
  const mime =
    format === "-->"
      ? "-->"
      : (MIME_BY_FORMAT[format.toUpperCase()] ??
        (format.length === 0 ? "" : `image/${format.toLowerCase()}`));

  const out = Buffer.concat([
    body.subarray(0, 1),
    Buffer.from(mime, "latin1"),
    Uint8Array.of(0x00),
    body.subarray(4),
  ]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
