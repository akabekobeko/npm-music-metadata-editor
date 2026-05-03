import type { PictureInfo } from "@akabeko/music-metadata-editor";
import type { SanitizedPicture } from "./types.js";

/**
 * Drop the raw `data` field from a list of pictures and replace it with a
 * `byteLength`.
 *
 * `Uint8Array` does not survive `JSON.stringify` cleanly (it serialises as
 * an Object with numeric keys), and CLI users who want the bytes use the
 * dedicated `mme picture extract` command instead.
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
