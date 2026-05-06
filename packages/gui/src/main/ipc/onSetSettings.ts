import { resolveLocale } from "../../shared/locales/resolveLocale.js";
import { applyMenuLocale } from "../menu/menuController.js";
import { applySettingsPatch } from "../settings/settings.js";
import type { AppSettings, IpcResult, SetSettingsRequest } from "./types.js";
import { toIpcError } from "./utils/toIpcError.js";

/**
 * Channel handler for `mme:settings:set`.
 *
 * Applies a deeply-partial patch to the cache and returns the merged snapshot.
 * The disk flush is debounced (see `applySettingsPatch`) so a burst of patches
 * — typical of a column resize drag — coalesces into a single write.
 *
 * Side effect: when the merged snapshot changes the active locale, the
 * native menu is rebuilt so labels track the new language without waiting
 * for the next `mme:menu:setState` push from the Renderer.
 *
 * @param _ev - Electron event object (unused).
 * @param request - Patch to deep-merge onto the current settings.
 * @returns The merged snapshot, or a serialisable error.
 */
export const onSetSettings = async (
  _ev: Electron.IpcMainInvokeEvent,
  request: SetSettingsRequest,
): Promise<IpcResult<AppSettings>> => {
  try {
    const next = applySettingsPatch(request.patch);
    if (request.patch.locale !== undefined) {
      applyMenuLocale(resolveLocale({ preference: next.locale, systemLocale: undefined }));
    }

    return { ok: true, value: next };
  } catch (error) {
    const ipcError = toIpcError(error);
    console.error("[mme:settings:set]", ipcError);
    return { ok: false, error: ipcError };
  }
};
