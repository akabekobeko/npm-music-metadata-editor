import type { LyricsInfo } from "@mme/ipc";

/** Discriminator for the lyrics cell display. */
export type LyricsKind = "none" | "text" | "synced";

/**
 * Cell-friendly view of a track's lyrics.
 *
 * `synced` wins over `text` when both forms coexist so the cell highlights the
 * richer payload. `label` is `undefined` for `"none"` so the consumer renders
 * an em-dash without re-checking the kind.
 */
export type LyricsSummary = {
  /** Discriminator picking the richer of synced / text / none. */
  readonly kind: LyricsKind;
  /** Cell label, or `undefined` when there are no lyrics. */
  readonly label: string | undefined;
};

/**
 * Classify a {@link LyricsInfo} block for spreadsheet display.
 *
 * @param lyrics - Lyrics payload from {@link Track}, or `undefined`.
 * @returns Discriminator and short cell label.
 */
export const summarizeLyrics = (lyrics: LyricsInfo | undefined): LyricsSummary => {
  if (!lyrics) {
    return { kind: "none", label: undefined };
  }

  const hasSynced = (lyrics.synchronized?.length ?? 0) > 0;
  if (hasSynced) {
    return { kind: "synced", label: "synced" };
  }

  const hasText = lyrics.unsynchronized !== undefined && lyrics.unsynchronized !== "";
  if (hasText) {
    return { kind: "text", label: "text" };
  }

  return { kind: "none", label: undefined };
};
