import type { PictureInfo } from "@mme/ipc";

/**
 * Modal-local picture draft.
 *
 * Wraps the core {@link PictureInfo} with a stable `id` so React lists keyed
 * by `id` survive reordering and duplicate inserts; `description` is kept as
 * a bare `string` (never `undefined`) for the same reason as
 * `LyricsDraft.description`.
 */
export type PictureDraft = {
  /** Stable identifier (UUID) used as the React list key. */
  readonly id: string;
  /** Picture role / kind. */
  readonly kind: PictureInfo["kind"];
  /** MIME type of the picture (`"image/jpeg"`, `"image/png"`, ...). */
  readonly mimeType: string;
  /** Free-form description (often empty). */
  readonly description: string;
  /** Raw image bytes. */
  readonly data: Uint8Array;
};
