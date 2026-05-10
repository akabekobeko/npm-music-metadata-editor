import type { Dictionary } from "./types.js";

/**
 * English translation table.
 *
 * Source of truth for the key set: every other locale must define exactly the
 * same keys (enforced by `t.test.ts`). Additions go here first so reviewers
 * can read the natural-English copy alongside the keys before translators
 * touch the other dictionaries.
 */
export const en: Dictionary = {
  "app.name": "Music Metadata Editor",
  "header.language": "Language",
  "header.language.system": "System",
  "header.language.en": "English",
  "header.language.ja": "日本語",
  "header.theme": "Theme",
  "header.theme.system": "System",
  "header.theme.light": "Light",
  "header.theme.dark": "Dark",
  "menu.app.about": "About Music Metadata Editor",
  "menu.app.preferences": "Preferences…",
  "menu.app.quit": "Quit",
  "menu.app.services": "Services",
  "menu.app.hide": "Hide",
  "menu.app.hideOthers": "Hide Others",
  "menu.app.unhide": "Show All",
  "menu.file": "File",
  "menu.file.openFiles": "Open Audio Files…",
  "menu.file.openRecent": "Open Recent",
  "menu.file.openRecent.empty": "No Recent Files",
  "menu.file.openRecent.clear": "Clear Recently Opened",
  "menu.file.save": "Save",
  "menu.file.saveAll": "Save All",
  "menu.file.discardChanges": "Discard Changes",
  "menu.file.closeAll": "Close All",
  "menu.file.close": "Close Window",
  "menu.edit": "Edit",
  "menu.edit.undo": "Undo",
  "menu.edit.redo": "Redo",
  "menu.edit.cut": "Cut",
  "menu.edit.copy": "Copy",
  "menu.edit.paste": "Paste",
  "menu.edit.selectAll": "Select All",
  "menu.view": "View",
  "menu.view.columns": "Columns",
  "menu.view.toggleTheme": "Toggle Dark Mode",
  "menu.view.reload": "Reload",
  "menu.view.toggleDevTools": "Toggle Developer Tools",
  "menu.help": "Help",
  "menu.help.website": "Visit Project Website",
  "menu.help.about": "About",
  "fatal.title": "Something went wrong",
  "fatal.description":
    "An unexpected error occurred. You can reload the window or quit the application.",
  "fatal.reload": "Reload",
  "fatal.quit": "Quit",
  "about.title": "About Music Metadata Editor",
  "about.version": "Version",
  "about.core": "Core library",
  "about.electron": "Electron",
  "about.chrome": "Chromium",
  "about.node": "Node.js",
  "about.license": "Licensed under the MIT License.",
  "about.repository": "Repository",
  "about.close": "Close",
};
