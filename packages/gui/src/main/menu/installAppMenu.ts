import { Menu, type MenuItemConstructorOptions, shell } from "electron";
import type { Locale } from "../../shared/locales/types.js";
import type { MenuActionPayload } from "../ipc/types.js";
import { buildAppMenu } from "./buildAppMenu.js";
import type { MenuItemTemplate, MenuState, MenuTemplate } from "./types.js";

/** Args for {@link installAppMenu}. */
type Args = {
  /** Live menu state — the function rebuilds whenever the caller invokes it. */
  readonly state: MenuState;
  /** Active UI locale; menu strings come from `t`. */
  readonly locale: Locale;
  /** Forward menu activations to the focused renderer's `mme:menu:action` channel. */
  readonly emit: (payload: MenuActionPayload) => void;
};

/**
 * Build the menu template, translate it to Electron primitives, and call
 * `Menu.setApplicationMenu`.
 *
 * Rebuild the entire menu on every state change. Electron does not give us a
 * "patch" API, and the menu is small enough that a fresh rebuild costs less
 * than tracking diff state. Tests cover the pure builder; this thin wrapper
 * is exercised manually during development.
 *
 * @param args - Live state, active locale, and the action emitter.
 */
export const installAppMenu = ({ state, locale, emit }: Args): void => {
  const template = buildAppMenu(state, locale);
  const native = template.map((item) => translate(item, emit));
  Menu.setApplicationMenu(Menu.buildFromTemplate([...native]));
};

/**
 * Recursively translate a {@link MenuItemTemplate} into Electron's
 * `MenuItemConstructorOptions`.
 *
 * - `action` becomes a `click` callback that emits the IPC payload.
 * - `externalUrl` becomes a `click` callback that calls `shell.openExternal`
 *   (used for `Help → Visit Project Website`).
 * - `submenu` is mapped recursively.
 *
 * @param item - Template node to translate.
 * @param emit - Function that publishes menu actions to the focused window.
 * @returns The Electron-compatible menu item.
 */
const translate = (
  item: MenuItemTemplate,
  emit: (payload: MenuActionPayload) => void,
): MenuItemConstructorOptions => {
  const out: MenuItemConstructorOptions = {
    label: item.label,
    accelerator: item.accelerator,
    enabled: item.enabled,
    visible: item.visible,
    type: item.type,
    role: item.role,
    checked: item.checked,
  };

  if (item.submenu !== undefined) {
    out.submenu = (item.submenu as MenuTemplate).map((child) => translate(child, emit));
  }

  if (item.action !== undefined) {
    const action = item.action;
    out.click = () => emit({ action, data: item.actionData });
  }

  if (item.externalUrl !== undefined) {
    const url = item.externalUrl;
    out.click = () => {
      void shell.openExternal(url);
    };
  }

  return out;
};
