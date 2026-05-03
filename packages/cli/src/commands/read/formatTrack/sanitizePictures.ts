import type { PictureInfo } from "@akabeko/music-metadata-editor";
import type { SanitizedPicture } from "./types.js";

/**
 * Drop the raw `data` field from a list of pictures and replace it with a
 * `byteLength`.
 *
 * `Uint8Array` does not survive `JSON.stringify` cleanly (it serialises as
 * an Object with numeric keys), and CLI users who want the bytes have a
 * dedicated extraction path planned for Phase 4. Until then the safest
 * default is to expose only metadata and the size.
 *
 * @param pictures - Picture entries from a `Track`.
 * @returns Sanitized copies suitable for JSON / pretty rendering.
 */
export const sanitizePictures = (pictures: readonly PictureInfo[]): readonly SanitizedPicture[] =>
  pictures.map((picture) => ({
    mimeType: picture.mimeType,
    kind: picture.kind,
    ...(picture.description === undefined ? {} : { description: picture.description }),
    byteLength: picture.data.byteLength,
  }));
