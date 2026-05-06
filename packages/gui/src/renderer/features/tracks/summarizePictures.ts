import type { PictureInfo } from "@mme/ipc";

/**
 * Numeric `kind` value for the "Cover (front)" picture role.
 *
 * Mirrors the shared ID3v2-derived enum used by core (`PictureKind.CoverFront`).
 * Renderer cannot value-import the core enum (Electron context isolation), so
 * the constant is duplicated locally; a regression test on the core side keeps
 * the two in sync.
 */
const PICTURE_KIND_COVER_FRONT = 3;

/**
 * Cell-friendly view of a track's embedded pictures.
 *
 * `label` is `undefined` when the track has no pictures so the cell renders
 * an em-dash without forcing the consumer to special-case `0`.
 */
export type PicturesSummary = {
  /** Total number of embedded pictures. */
  readonly count: number;
  /** `true` when at least one picture has the Cover (front) role. */
  readonly hasCoverFront: boolean;
  /** Cell label, or `undefined` when there are no pictures. */
  readonly label: string | undefined;
};

/**
 * Reduce an embedded-picture list into a spreadsheet cell summary.
 *
 * @param pictures - Pictures attached to the track.
 * @returns Count, whether a Cover (front) is present, and the cell label
 *   (`undefined` when the list is empty).
 */
export const summarizePictures = (pictures: readonly PictureInfo[]): PicturesSummary => {
  if (pictures.length === 0) {
    return { count: 0, hasCoverFront: false, label: undefined };
  }

  const hasCoverFront = pictures.some((entry) => entry.kind === PICTURE_KIND_COVER_FRONT);
  const label = hasCoverFront ? `${pictures.length} (cover)` : String(pictures.length);
  return { count: pictures.length, hasCoverFront, label };
};
