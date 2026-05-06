import type { Locale } from "../../shared/locales/types.js";
import type { MenuAction } from "../ipc/types.js";

/**
 * Inputs that drive {@link buildAppMenu}.
 *
 * Carries the slice of state that influences which items are enabled and what
 * appears under "Open Recent". Kept narrow on purpose so the test surface
 * stays small and platform / dev flags can be flipped independently.
 */
export type MenuState = {
  /** `true` while at least one row is dirty. Drives Save / Discard enablement. */
  readonly hasDirty: boolean;
  /** Persisted recent-files list — newest first, capped by the settings layer. */
  readonly recentFiles: readonly string[];
  /** Currently effective theme; the `Toggle Dark Mode` checkbox tracks it. */
  readonly theme: "light" | "dark";
  /** `true` on macOS — controls the leading `<App>` menu and platform-specific accelerators. */
  readonly isMac: boolean;
  /** `true` in development builds — toggles Reload / DevTools entries. */
  readonly isDev: boolean;
  /** Columns shown under `View → Columns`. Empty list collapses the submenu. */
  readonly columns: readonly MenuColumn[];
  /** URL opened by `Help → Visit Project Website`. */
  readonly websiteUrl: string;
};

/** Descriptor for one column toggle inside the View → Columns submenu. */
export type MenuColumn = {
  /** Stable id sent back as `actionData` when the user toggles the entry. */
  readonly id: string;
  /** Human-readable label shown in the menu. */
  readonly label: string;
  /** Current visibility — drives the checkbox state. */
  readonly visible: boolean;
};

/**
 * Custom menu-template node passed to {@link buildAppMenu}'s consumer.
 *
 * Mirrors a subset of Electron's `MenuItemConstructorOptions` plus an
 * {@link MenuAction} discriminator so the install layer can wire each item
 * to its IPC `mme:menu:action` payload. Roles (`copy`, `quit`, …) bypass the
 * action mapping because Electron handles them natively.
 *
 * Re-exporting `MenuAction` from here would cycle through `ipc/types.ts`;
 * callers import it directly from that module.
 */
export type MenuItemTemplate = {
  /** Display label; omitted for separators. */
  readonly label?: string;
  /** Keyboard shortcut string passed straight to Electron (e.g. `"CmdOrCtrl+S"`). */
  readonly accelerator?: string;
  /** Disable the item without hiding it. */
  readonly enabled?: boolean;
  /** Hide the item entirely. */
  readonly visible?: boolean;
  /** Item kind — `"separator"` produces a divider, others are interactive. */
  readonly type?: "normal" | "separator" | "submenu" | "checkbox" | "radio";
  /** Built-in Electron role; bypasses the `action` mapping when set. */
  readonly role?:
    | "appMenu"
    | "fileMenu"
    | "editMenu"
    | "viewMenu"
    | "windowMenu"
    | "help"
    | "about"
    | "services"
    | "hide"
    | "hideOthers"
    | "unhide"
    | "quit"
    | "close"
    | "undo"
    | "redo"
    | "cut"
    | "copy"
    | "paste"
    | "selectAll"
    | "reload"
    | "toggleDevTools"
    | "togglefullscreen";
  /**
   * Action discriminant emitted on `mme:menu:action` when the item is
   * activated. The install layer fills in `click` from this; pure builders
   * never reference Electron's runtime.
   */
  readonly action?: MenuAction;
  /** Auxiliary payload routed through `mme:menu:action.data`. */
  readonly actionData?: unknown;
  /**
   * URL opened with `shell.openExternal` when the user activates the item.
   *
   * Mutually exclusive with `action`: use this for purely Main-side side
   * effects (e.g. "Visit Project Website") so the IPC bridge is not paid
   * for actions that never reach the Renderer.
   */
  readonly externalUrl?: string;
  /** Set on `Toggle Dark Mode` so Electron renders the radio/checkmark. */
  readonly checked?: boolean;
  /** Nested submenu — promotes the item to a parent node. */
  readonly submenu?: readonly MenuItemTemplate[];
};

/** Top-level template returned by {@link buildAppMenu}. */
export type MenuTemplate = readonly MenuItemTemplate[];

/** Re-export to keep `buildAppMenu` callers from re-stating the locale type. */
export type { Locale };
