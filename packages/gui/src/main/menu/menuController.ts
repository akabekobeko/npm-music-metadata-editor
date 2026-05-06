import { app } from "electron";
import type { MenuActionPayload, MenuStateSnapshot } from "../ipc/types.js";
import type { Locale } from "../locales/types.js";
import { installAppMenu } from "./installAppMenu.js";
import type { MenuState } from "./types.js";

/** Args for {@link initializeMenuController}. */
type InitArgs = {
  /** Initial values, typically derived from `getSettings()` at startup. */
  readonly initialSnapshot: MenuStateSnapshot;
  readonly locale: Locale;
  /** Forwards `mme:menu:action` payloads to the focused renderer. */
  readonly emit: (payload: MenuActionPayload) => void;
  /** GitHub repository URL exposed in the Help menu. */
  readonly websiteUrl: string;
};

/**
 * Module-level state for the menu controller.
 *
 * The controller is a singleton because Electron's `Menu.setApplicationMenu`
 * is process-global. Wrapping the state lets `applyMenuStatePatch` rebuild
 * the menu without requiring callers to re-pass the static fields.
 */
type ControllerState = {
  state: MenuState;
  locale: Locale;
  emit: (payload: MenuActionPayload) => void;
};

let controller: ControllerState | null = null;

/**
 * Build the initial application menu and remember the controller state.
 *
 * Idempotent: a second call replaces the prior controller (useful for tests
 * that re-create the Main lifecycle). Should be invoked from
 * `app.whenReady()` after the renderer settings load.
 *
 * @param args - Initial snapshot, locale, action emitter, website URL.
 */
export const initializeMenuController = ({
  initialSnapshot,
  locale,
  emit,
  websiteUrl,
}: InitArgs): void => {
  const state: MenuState = {
    ...initialSnapshot,
    isMac: process.platform === "darwin",
    isDev: !app.isPackaged,
    websiteUrl,
  };
  controller = { state, locale, emit };
  installAppMenu({ state, locale, emit });
};

/**
 * Replace the dynamic slice of menu state and re-install the menu.
 *
 * Called on every `mme:menu:setState` so the Renderer is the source of truth
 * for `hasDirty` / `recentFiles` / `theme` / `columns`. No-op when the
 * controller has not been initialised yet (e.g. early in app startup).
 *
 * @param snapshot - Latest dynamic slice from the Renderer.
 */
export const applyMenuStateSnapshot = (snapshot: MenuStateSnapshot): void => {
  if (controller === null) {
    return;
  }

  controller.state = { ...controller.state, ...snapshot };
  installAppMenu({ state: controller.state, locale: controller.locale, emit: controller.emit });
};

/**
 * Update the active locale and rebuild the menu.
 *
 * Used by `mme:settings:set` when the user toggles language. The renderer
 * does not need to know — it pushes the new locale through the existing
 * settings channel and Main reacts here.
 *
 * @param locale - New locale.
 */
export const applyMenuLocale = (locale: Locale): void => {
  if (controller === null) {
    return;
  }

  controller.locale = locale;
  installAppMenu({ state: controller.state, locale, emit: controller.emit });
};

/**
 * Forget the controller state.
 *
 * Wired to `will-quit` so the next process start (e.g. in tests that share a
 * worker) gets a clean slate. The Electron application menu itself is
 * automatically reset when the process exits.
 */
export const releaseMenuController = (): void => {
  controller = null;
};
