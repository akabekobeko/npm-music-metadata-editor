import type { LyricsInfo } from "@mme/ipc";
import type { LyricsDraft } from "./types.js";

/**
 * Trim wrapper that returns `undefined` when the result is empty.
 *
 * @param value - Raw input string.
 * @returns The trimmed value, or `undefined` when nothing remains.
 */
const trimToOptional = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

/**
 * Collapse a {@link LyricsDraft} into a `LyricsInfo` (or `undefined`).
 *
 * Empty payloads return `undefined` so callers can clear the track's lyrics
 * by writing the dialog state back unchanged. The plain-text form is checked
 * with `String.prototype.trim` so a textarea filled with only whitespace
 * counts as empty; the synchronized form is non-empty whenever at least one
 * line exists, regardless of whether each line carries text.
 *
 * @param draft - Modal-local lyrics draft state.
 * @returns A `LyricsInfo` populated with the non-empty fields, or `undefined`
 *   when both the plain-text and synchronized payloads are empty.
 */
export const buildLyricsInfoFromDraft = (draft: LyricsDraft): LyricsInfo | undefined => {
  const unsynchronized = trimToOptional(draft.unsynchronized);
  const synchronized = draft.synchronized.length === 0 ? undefined : [...draft.synchronized];
  if (unsynchronized === undefined && synchronized === undefined) {
    return undefined;
  }

  const language = trimToOptional(draft.language);
  const description = trimToOptional(draft.description);
  const result: LyricsInfo = {};
  if (language !== undefined) {
    result.language = language;
  }

  if (description !== undefined) {
    result.description = description;
  }

  if (unsynchronized !== undefined) {
    result.unsynchronized = unsynchronized;
  }

  if (synchronized !== undefined) {
    result.synchronized = synchronized;
  }

  return result;
};
