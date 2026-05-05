import type { LyricsInfo } from "../../../main/ipc/types.js";
import type { LyricsDraft } from "./types.js";

/**
 * Lift a `LyricsInfo` (or `undefined`) into a {@link LyricsDraft} suitable
 * for the dialog state.
 *
 * Empty optional fields are filled with `""` / `[]` so the form inputs can
 * bind without nullish guards. The reverse projection lives in
 * {@link buildLyricsInfoFromDraft}.
 *
 * @param lyrics - Optional lyrics block from the row's track.
 * @returns A draft with non-`undefined` strings.
 */
export const lyricsInfoToDraft = (lyrics: LyricsInfo | undefined): LyricsDraft => ({
  language: lyrics?.language ?? "",
  description: lyrics?.description ?? "",
  unsynchronized: lyrics?.unsynchronized ?? "",
  synchronized: lyrics?.synchronized === undefined ? [] : [...lyrics.synchronized],
});
