import { describe, expect, it } from "vitest";
import { buildAppMenu } from "./buildAppMenu.js";
import type { MenuItemTemplate, MenuState, MenuTemplate } from "./types.js";

const baseState: MenuState = {
  hasDirty: false,
  recentFiles: [],
  theme: "light",
  isMac: false,
  isDev: false,
  columns: [],
  websiteUrl: "https://example.test/repo",
};

/**
 * Locate a top-level menu by `label`.
 *
 * The labels come from the dictionary; tests assert behaviour, not the exact
 * copy. This helper trades the dictionary lookup so individual cases stay
 * readable.
 *
 * @param menu - Output of {@link buildAppMenu}.
 * @param label - Localised label.
 * @returns The matching template, or `undefined` if absent.
 */
const findMenu = (menu: MenuTemplate, label: string): MenuItemTemplate | undefined =>
  menu.find((item) => item.label === label);

/**
 * Recursively walk every item in a menu template.
 *
 * @param menu - Output of {@link buildAppMenu}.
 * @returns Every item in DFS order.
 */
const walk = (menu: MenuTemplate): MenuItemTemplate[] => {
  const out: MenuItemTemplate[] = [];
  for (const item of menu) {
    out.push(item);
    if (item.submenu !== undefined) {
      out.push(...walk(item.submenu));
    }
  }

  return out;
};

describe("top-level structure", () => {
  it("does not emit the macOS app menu on linux/win32", () => {
    const menu = buildAppMenu(baseState, "en");
    const labels = menu.map((item) => item.label);
    expect(labels).not.toContain("Music Metadata Editor");
    expect(labels[0]).toBe("File");
  });

  it("prepends the macOS app menu when isMac is true", () => {
    const menu = buildAppMenu({ ...baseState, isMac: true }, "en");
    expect(menu[0]?.label).toBe("Music Metadata Editor");
    const appSubmenu = menu[0]?.submenu ?? [];
    const labels = appSubmenu.map((item) => item.label).filter((label) => label !== undefined);
    expect(labels).toContain("About Music Metadata Editor");
    expect(labels).toContain("Quit");
  });
});

describe("File menu", () => {
  it("disables Save / Save All / Discard when no rows are dirty", () => {
    const menu = buildAppMenu(baseState, "en");
    const file = findMenu(menu, "File");
    const items = file?.submenu ?? [];
    expect(items.find((item) => item.label === "Save")?.enabled).toBe(false);
    expect(items.find((item) => item.label === "Save All")?.enabled).toBe(false);
    expect(items.find((item) => item.label === "Discard Changes")?.enabled).toBe(false);
  });

  it("enables Save / Save All / Discard when at least one row is dirty", () => {
    const menu = buildAppMenu({ ...baseState, hasDirty: true }, "en");
    const items = findMenu(menu, "File")?.submenu ?? [];
    expect(items.find((item) => item.label === "Save")?.enabled).toBe(true);
    expect(items.find((item) => item.label === "Save All")?.enabled).toBe(true);
    expect(items.find((item) => item.label === "Discard Changes")?.enabled).toBe(true);
  });

  it("renders a placeholder when Open Recent is empty", () => {
    const menu = buildAppMenu(baseState, "en");
    const recent = findMenu(menu, "File")?.submenu?.find((item) => item.label === "Open Recent");
    const submenu = recent?.submenu ?? [];
    expect(submenu).toHaveLength(1);
    expect(submenu[0]?.enabled).toBe(false);
  });

  it("renders one entry per recent file plus a separator + clear footer", () => {
    const recentFiles = ["/tmp/a.mp3", "/tmp/b.flac"];
    const menu = buildAppMenu({ ...baseState, recentFiles }, "en");
    const recent = findMenu(menu, "File")?.submenu?.find((item) => item.label === "Open Recent");
    const submenu = recent?.submenu ?? [];
    expect(submenu[0]?.label).toBe("a.mp3");
    expect(submenu[0]?.action).toBe("openRecent");
    expect(submenu[0]?.actionData).toBe("/tmp/a.mp3");
    expect(submenu[1]?.label).toBe("b.flac");
    expect(submenu[2]?.type).toBe("separator");
    expect(submenu[3]?.action).toBe("openRecent");
    expect(submenu[3]?.actionData).toBe(null);
  });

  it("uses Quit on linux/win32 and Close Window on macOS", () => {
    const linux = buildAppMenu(baseState, "en");
    const linuxItems = findMenu(linux, "File")?.submenu ?? [];
    expect(linuxItems.find((item) => item.role === "quit")).toBeDefined();

    const mac = buildAppMenu({ ...baseState, isMac: true }, "en");
    const macItems = findMenu(mac, "File")?.submenu ?? [];
    expect(macItems.find((item) => item.role === "close")).toBeDefined();
  });
});

describe("View menu", () => {
  it("hides Reload / DevTools entries in production", () => {
    const menu = buildAppMenu(baseState, "en");
    const view = findMenu(menu, "View");
    const labels = (view?.submenu ?? []).map((item) => item.label);
    expect(labels).not.toContain("Reload");
    expect(labels).not.toContain("Toggle Developer Tools");
  });

  it("shows Reload / DevTools entries when isDev is true", () => {
    const menu = buildAppMenu({ ...baseState, isDev: true }, "en");
    const view = findMenu(menu, "View");
    const labels = (view?.submenu ?? []).map((item) => item.label);
    expect(labels).toContain("Reload");
    expect(labels).toContain("Toggle Developer Tools");
  });

  it("checks the Toggle Dark Mode entry when theme is dark", () => {
    const menu = buildAppMenu({ ...baseState, theme: "dark" }, "en");
    const view = findMenu(menu, "View");
    const toggle = (view?.submenu ?? []).find((item) => item.action === "toggleTheme");
    expect(toggle?.checked).toBe(true);
  });

  it("renders Columns submenu only when columns are present", () => {
    const empty = buildAppMenu(baseState, "en");
    expect(
      (findMenu(empty, "View")?.submenu ?? []).find((item) => item.label === "Columns"),
    ).toBeUndefined();

    const withCols = buildAppMenu(
      {
        ...baseState,
        columns: [
          { id: "fileName", label: "File Name", visible: true },
          { id: "tag.title", label: "Title", visible: false },
        ],
      },
      "en",
    );
    const cols = (findMenu(withCols, "View")?.submenu ?? []).find(
      (item) => item.label === "Columns",
    );
    const inner = cols?.submenu ?? [];
    expect(inner).toHaveLength(2);
    expect(inner[0]?.checked).toBe(true);
    expect(inner[0]?.action).toBe("toggleColumn");
    expect(inner[0]?.actionData).toBe("fileName");
    expect(inner[1]?.checked).toBe(false);
  });
});

describe("locale", () => {
  it("renders Japanese labels when locale is ja", () => {
    const menu = buildAppMenu(baseState, "ja");
    expect(menu.map((item) => item.label)).toEqual(["ファイル", "編集", "表示", "ヘルプ"]);
  });
});

describe("Help menu", () => {
  it("threads the website URL onto the Visit Project Website item", () => {
    const menu = buildAppMenu({ ...baseState, websiteUrl: "https://example.test/abc" }, "en");
    const help = findMenu(menu, "Help");
    const visit = (help?.submenu ?? []).find((item) => item.label === "Visit Project Website");
    expect(visit?.externalUrl).toBe("https://example.test/abc");
    expect(visit?.action).toBeUndefined();
  });
});

describe("accelerators", () => {
  it("uses CmdOrCtrl prefix so Electron picks the platform-correct modifier", () => {
    const menu = buildAppMenu(baseState, "en");
    const accelerators = walk(menu)
      .map((item) => item.accelerator)
      .filter((value): value is string => value !== undefined);
    expect(accelerators).toContain("CmdOrCtrl+O");
    expect(accelerators).toContain("CmdOrCtrl+S");
    expect(accelerators).toContain("CmdOrCtrl+Shift+S");
  });

  it("uses Ctrl+Q for Quit on linux/win32 and Command+Q on macOS", () => {
    const linux = buildAppMenu(baseState, "en");
    const linuxQuit = walk(linux).find((item) => item.role === "quit");
    expect(linuxQuit?.accelerator).toBe("Ctrl+Q");

    const mac = buildAppMenu({ ...baseState, isMac: true }, "en");
    const macQuit = walk(mac).find((item) => item.role === "quit");
    expect(macQuit?.accelerator).toBe("Command+Q");
  });
});
