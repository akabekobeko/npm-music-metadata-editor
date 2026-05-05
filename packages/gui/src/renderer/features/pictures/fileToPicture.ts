import { detectMimeType } from "./detectMimeType.js";
import type { PictureDraft } from "./types.js";

/**
 * Default `kind` for newly added pictures.
 *
 * `3` is `PictureKind.CoverFront` from core. The constant is duplicated here
 * (see also `summarizePictures.ts`) because Renderer cannot value-import the
 * core enum across the context-isolated bridge.
 */
const PICTURE_KIND_COVER_FRONT = 3;

/**
 * Build a {@link PictureDraft} from a browser `File`.
 *
 * Resolves the file's bytes via `File.arrayBuffer()`, sniffs the MIME type
 * (preferring magic numbers over the file extension — see
 * {@link detectMimeType}), and stamps a fresh UUID so React lists keyed by
 * `id` survive duplicate inserts of the same source file.
 *
 * @param file - File picked from the dialog or drag-and-drop.
 * @returns A draft suitable for the Pictures dialog state.
 */
export const fileToPicture = async (file: File): Promise<PictureDraft> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const mimeType = detectMimeType({ fileName: file.name, bytes });
  return {
    id: globalThis.crypto.randomUUID(),
    kind: PICTURE_KIND_COVER_FRONT,
    mimeType,
    description: "",
    data: bytes,
  };
};
