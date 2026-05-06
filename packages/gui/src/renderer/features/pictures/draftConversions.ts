import type { PictureInfo } from "@mme/ipc";
import type { PictureDraft } from "./types.js";

/**
 * Lift a list of {@link PictureInfo} values into modal-local
 * {@link PictureDraft}s.
 *
 * Each entry receives a fresh UUID so the dialog can use it as a stable React
 * key even when the underlying picture list contains structurally identical
 * entries. `description` is normalized to a non-`undefined` string for the
 * form bindings.
 *
 * @param pictures - Pictures from the row's track.
 * @returns A draft array suitable for `useState` initialization.
 */
export const pictureInfosToDrafts = (pictures: readonly PictureInfo[]): readonly PictureDraft[] =>
  pictures.map((picture) => ({
    id: globalThis.crypto.randomUUID(),
    kind: picture.kind,
    mimeType: picture.mimeType,
    description: picture.description ?? "",
    data: picture.data,
  }));

/**
 * Lower a draft list back into the immutable {@link PictureInfo} shape that
 * the edit store expects.
 *
 * Empty descriptions are dropped (rather than serialized as the empty
 * string) to match how core round-trips the field — `undefined` and `""`
 * are conceptually equivalent for ID3v2 APIC and friends.
 *
 * @param drafts - Modal-local draft list.
 * @returns A `PictureInfo[]` that can be applied to a `Track`.
 */
export const draftsToPictureInfos = (drafts: readonly PictureDraft[]): readonly PictureInfo[] =>
  drafts.map((draft) => {
    const base: PictureInfo = {
      mimeType: draft.mimeType,
      kind: draft.kind,
      data: draft.data,
    };
    if (draft.description !== "") {
      base.description = draft.description;
    }

    return base;
  });
