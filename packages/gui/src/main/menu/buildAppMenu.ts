import { t } from "../locales/t.js";
import type { Locale } from "../locales/types.js";
import { basename } from "./basename.js";
import type { MenuItemTemplate, MenuState, MenuTemplate } from "./types.js";

/**
 * Build the Electron application-menu template from declarative state.
 *
 * Pure function: no Electron imports, no `process.platform` reads. The
 * caller hands in `state.isMac` / `state.isDev` so the same code path is
 * exercised regardless of where the test runs.
 *
 * The output is a {@link MenuTemplate}, a custom node tree that mirrors a
 * subset of Electron's `MenuItemConstructorOptions` plus an `action`
 * discriminant. {@link installAppMenu} maps the templates to live menu items
 * and forwards activations through `mme:menu:action`.
 *
 * @param state - The slice of app state that drives label / enable decisions.
 * @param locale - Active UI locale; menu strings come from {@link t}.
 * @returns The fully-populated menu template.
 */
export const buildAppMenu = (state: MenuState, locale: Locale): MenuTemplate => {
  const items: MenuItemTemplate[] = [];

  if (state.isMac) {
    items.push(buildAppMenuRoot(locale));
  }

  items.push(buildFileMenu(state, locale));
  items.push(buildEditMenu(state, locale));
  items.push(buildViewMenu(state, locale));
  items.push(buildHelpMenu(locale, state.websiteUrl));

  return items;
};

/**
 * macOS leading "<App>" menu.
 *
 * Electron's `appMenu` role auto-fills About / Services / Hide / Quit when
 * targeted at darwin, but we keep an explicit template so labels can be
 * localised and the About item routes back to the renderer's modal.
 *
 * @param locale - Active UI locale.
 * @returns The macOS app-menu template.
 */
const buildAppMenuRoot = (locale: Locale): MenuItemTemplate => ({
  label: t("app.name", locale),
  submenu: [
    { label: t("menu.app.about", locale), action: "showAbout" },
    { type: "separator" },
    { label: t("menu.app.services", locale), role: "services" },
    { type: "separator" },
    {
      label: t("menu.app.hide", locale),
      role: "hide",
      accelerator: "Command+H",
    },
    {
      label: t("menu.app.hideOthers", locale),
      role: "hideOthers",
      accelerator: "Command+Alt+H",
    },
    { label: t("menu.app.unhide", locale), role: "unhide" },
    { type: "separator" },
    { label: t("menu.app.quit", locale), role: "quit", accelerator: "Command+Q" },
  ],
});

/**
 * Top-level "File" submenu.
 *
 * Save / Discard / Close All gate on `state.hasDirty` so dirty operations
 * are unreachable from the menu when there is nothing to apply. The Quit
 * entry is omitted on macOS because the `<App>` menu already provides it.
 *
 * @param state - Drives `enabled` flags and the recent-files submenu.
 * @param locale - Active UI locale.
 * @returns The File menu template.
 */
const buildFileMenu = (state: MenuState, locale: Locale): MenuItemTemplate => ({
  label: t("menu.file", locale),
  submenu: [
    {
      label: t("menu.file.openFiles", locale),
      accelerator: "CmdOrCtrl+O",
      action: "openFiles",
    },
    {
      label: t("menu.file.openRecent", locale),
      submenu: buildRecentSubmenu(state.recentFiles, locale),
    },
    { type: "separator" },
    {
      label: t("menu.file.save", locale),
      accelerator: "CmdOrCtrl+S",
      enabled: state.hasDirty,
      action: "saveSelected",
    },
    {
      label: t("menu.file.saveAll", locale),
      accelerator: "CmdOrCtrl+Shift+S",
      enabled: state.hasDirty,
      action: "saveAll",
    },
    {
      label: t("menu.file.discardChanges", locale),
      enabled: state.hasDirty,
      action: "discardChanges",
    },
    { type: "separator" },
    { label: t("menu.file.closeAll", locale), action: "closeAll" },
    state.isMac
      ? { label: t("menu.file.close", locale), role: "close", accelerator: "Command+W" }
      : { label: t("menu.app.quit", locale), role: "quit", accelerator: "Ctrl+Q" },
  ],
});

/**
 * Build the "Open Recent" submenu from the persisted list.
 *
 * Empty lists collapse to a disabled "No Recent Files" sentinel so the
 * submenu still renders (Electron hides empty submenus inconsistently across
 * platforms). A "Clear Recently Opened" footer surfaces the same dispatch
 * the Renderer uses when it overwrites `recentFiles` with `[]`.
 *
 * @param recentFiles - Newest-first persisted list.
 * @param locale - Active UI locale.
 * @returns The submenu template.
 */
const buildRecentSubmenu = (
  recentFiles: readonly string[],
  locale: Locale,
): readonly MenuItemTemplate[] => {
  if (recentFiles.length === 0) {
    return [{ label: t("menu.file.openRecent.empty", locale), enabled: false }];
  }

  const entries: MenuItemTemplate[] = recentFiles.map((filePath) => ({
    label: basename(filePath),
    action: "openRecent" as const,
    actionData: filePath,
  }));
  entries.push({ type: "separator" });
  entries.push({
    label: t("menu.file.openRecent.clear", locale),
    action: "openRecent",
    actionData: null,
  });
  return entries;
};

/**
 * Top-level "Edit" submenu.
 *
 * The first six entries map directly onto Electron's built-in roles so
 * native shortcuts (system-wide cut/copy/paste behaviour, IME edits, …)
 * keep working. `Select All` is the only entry that bridges to Renderer
 * state because the spreadsheet has its own selection model.
 *
 * @param _state - Reserved for future state-driven entries.
 * @param locale - Active UI locale.
 * @returns The Edit menu template.
 */
const buildEditMenu = (_state: MenuState, locale: Locale): MenuItemTemplate => ({
  label: t("menu.edit", locale),
  submenu: [
    { label: t("menu.edit.undo", locale), role: "undo" },
    { label: t("menu.edit.redo", locale), role: "redo" },
    { type: "separator" },
    { label: t("menu.edit.cut", locale), role: "cut" },
    { label: t("menu.edit.copy", locale), role: "copy" },
    { label: t("menu.edit.paste", locale), role: "paste" },
    { type: "separator" },
    {
      label: t("menu.edit.selectAll", locale),
      accelerator: "CmdOrCtrl+A",
      action: "selectAll",
    },
  ],
});

/**
 * Top-level "View" submenu.
 *
 * Reload / DevTools only show in development builds — the `view` menu is
 * otherwise occupied by user-facing toggles (theme, columns) so keeping the
 * dev entries hidden in production avoids cluttering the surface.
 *
 * @param state - Provides `theme` and `isDev`.
 * @param locale - Active UI locale.
 * @returns The View menu template.
 */
const buildViewMenu = (state: MenuState, locale: Locale): MenuItemTemplate => {
  const submenu: MenuItemTemplate[] = [];

  if (state.columns.length > 0) {
    submenu.push({
      label: t("menu.view.columns", locale),
      submenu: state.columns.map(
        (column): MenuItemTemplate => ({
          label: column.label,
          type: "checkbox",
          checked: column.visible,
          action: "toggleColumn",
          actionData: column.id,
        }),
      ),
    });
    submenu.push({ type: "separator" });
  }

  submenu.push({
    label: t("menu.view.toggleTheme", locale),
    accelerator: "CmdOrCtrl+Shift+L",
    type: "checkbox",
    checked: state.theme === "dark",
    action: "toggleTheme",
  });

  if (state.isDev) {
    submenu.push({ type: "separator" });
    submenu.push({ label: t("menu.view.reload", locale), role: "reload" });
    submenu.push({
      label: t("menu.view.toggleDevTools", locale),
      role: "toggleDevTools",
    });
  }

  return { label: t("menu.view", locale), submenu };
};

/**
 * Top-level "Help" submenu.
 *
 * `Visit Project Website` opens the GitHub repository (via Renderer because
 * the repo URL lives in package.json + the About dialog already knows it).
 * "About" routes to the in-app modal so users see core / electron / chrome
 * versions in addition to the GUI version.
 *
 * @param locale - Active UI locale.
 * @returns The Help menu template.
 */
const buildHelpMenu = (locale: Locale, websiteUrl: string): MenuItemTemplate => ({
  label: t("menu.help", locale),
  role: "help",
  submenu: [
    { label: t("menu.help.website", locale), externalUrl: websiteUrl },
    { type: "separator" },
    { label: t("menu.help.about", locale), action: "showAbout" },
  ],
});
