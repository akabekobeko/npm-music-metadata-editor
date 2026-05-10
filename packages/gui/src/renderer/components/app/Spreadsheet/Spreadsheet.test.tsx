// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

// jsdom does not implement ResizeObserver / proper layout; replace the
// virtualizer with a simple "render every row" stub so cells are queryable.
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { readonly count: number }) => ({
    getTotalSize: () => count * 32,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * 32,
        size: 32,
        key: index,
        end: (index + 1) * 32,
        lane: 0,
      })),
  }),
}));

import type { AudioFormat, FormatSupportEntry, TagData, Track } from "@mme/ipc";
import { TooltipProvider } from "../../../components/ui/tooltip";
import { buildColumns } from "../../../features/spreadsheet/buildColumns";
import type { ColumnId, FormatSupportMap } from "../../../features/spreadsheet/types";
import type { TrackRow } from "../../../features/tracks/types";
import { Spreadsheet } from "./Spreadsheet";
import type { CommitArgs, PasteArgs } from "./types";

type CommitFn = (args: CommitArgs) => void;
type PasteFn = (args: PasteArgs) => void;
type UndoFn = () => void;

type ScenarioArgs = {
  readonly visibleIds: readonly ColumnId[];
  readonly rows: readonly TrackRow[];
  readonly support: FormatSupportMap;
  readonly handlers?: {
    readonly onCommit?: CommitFn;
    readonly onPaste?: PasteFn;
    readonly onUndo?: UndoFn;
  };
};

const renderSpreadsheet = ({ visibleIds, rows, support, handlers = {} }: ScenarioArgs) => {
  const onCommit: CommitFn = handlers.onCommit ?? vi.fn();
  const onPaste: PasteFn = handlers.onPaste ?? vi.fn();
  const onUndo: UndoFn = handlers.onUndo ?? vi.fn();
  const columns = buildColumns(visibleIds, support);
  const columnWidths = Object.fromEntries(
    columns.map((column) => [column.id, column.width]),
  ) as Record<ColumnId, number>;
  const result = render(
    <TooltipProvider>
      <Spreadsheet
        columns={columns}
        rows={rows}
        support={support}
        columnWidths={columnWidths}
        onOpenPictures={() => {}}
        onOpenLyrics={() => {}}
        onCommit={onCommit}
        onPaste={onPaste}
        onUndo={onUndo}
        onColumnResize={() => {}}
      />
    </TooltipProvider>,
  );
  return { ...result, onCommit, onPaste, onUndo };
};

type RowSeed = {
  readonly filePath: string;
  readonly audioFormat: AudioFormat;
  readonly title?: string;
  readonly language?: string;
};

const buildRow = ({ filePath, audioFormat, title, language }: RowSeed): TrackRow => {
  const tag: TagData = {};
  if (title !== undefined) {
    tag.title = title;
  }
  if (language !== undefined) {
    tag.language = language;
  }

  const track: Track = {
    audioFormat,
    durationMs: 1000,
    tag,
    pictures: [],
    chapters: [],
    additionalFields: {},
    warnings: [],
  };
  return { filePath, track, origin: track, dirty: false };
};

const supportEntry = (
  format: AudioFormat,
  writableTagFields: ReadonlyArray<keyof TagData>,
): FormatSupportEntry => ({
  format,
  writableTagFields,
  supportsPictures: false,
  supportsChapters: false,
  supportsLyrics: false,
});

const supportMap = (entries: readonly FormatSupportEntry[]): FormatSupportMap =>
  new Map(entries.map((entry) => [entry.format, entry]));

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("opens an inline editor on double-click and commits on Enter", () => {
  const onCommit = vi.fn();
  renderSpreadsheet({
    visibleIds: ["fileName", "tag.title"],
    rows: [buildRow({ filePath: "/a.mp3", audioFormat: "mp3", title: "Old" })],
    support: supportMap([supportEntry("mp3", ["title"])]),
    handlers: { onCommit },
  });

  const cell = screen.getByText("Old");
  fireEvent.doubleClick(cell);
  const input = screen.getByDisplayValue("Old") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "New" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ field: "title", value: "New" }));
});

it("keeps the inline editor open when clicking inside the editing cell", () => {
  const onCommit = vi.fn();
  renderSpreadsheet({
    visibleIds: ["fileName", "tag.title"],
    rows: [buildRow({ filePath: "/a.mp3", audioFormat: "mp3", title: "Old" })],
    support: supportMap([supportEntry("mp3", ["title"])]),
    handlers: { onCommit },
  });

  fireEvent.doubleClick(screen.getByText("Old"));
  const input = screen.getByDisplayValue("Old") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "Edited" } });
  fireEvent.click(input);

  expect(screen.getByDisplayValue("Edited")).toBe(input);
  expect(onCommit).not.toHaveBeenCalled();
});

it("commits the edited value when the input loses focus", () => {
  const onCommit = vi.fn();
  renderSpreadsheet({
    visibleIds: ["fileName", "tag.title"],
    rows: [buildRow({ filePath: "/a.mp3", audioFormat: "mp3", title: "Old" })],
    support: supportMap([supportEntry("mp3", ["title"])]),
    handlers: { onCommit },
  });

  fireEvent.doubleClick(screen.getByText("Old"));
  const input = screen.getByDisplayValue("Old") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "Text" } });
  fireEvent.blur(input);

  expect(onCommit).toHaveBeenCalledWith(
    expect.objectContaining({ field: "title", value: "Text" }),
  );
});

it("discards the edit on blur when the value fails validation", () => {
  const onCommit = vi.fn();
  renderSpreadsheet({
    visibleIds: ["fileName", "tag.language"],
    rows: [buildRow({ filePath: "/a.mp3", audioFormat: "mp3", language: "eng" })],
    support: supportMap([supportEntry("mp3", ["language"])]),
    handlers: { onCommit },
  });

  fireEvent.doubleClick(screen.getByText("eng"));
  const input = screen.getByDisplayValue("eng") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "ZZZZZ" } });
  fireEvent.blur(input);

  expect(onCommit).not.toHaveBeenCalled();
  expect(screen.queryByDisplayValue("ZZZZZ")).toBeNull();
});

it("keeps disabled cells out of edit mode on double-click", () => {
  const onCommit = vi.fn();
  renderSpreadsheet({
    visibleIds: ["fileName", "tag.title"],
    rows: [buildRow({ filePath: "/a.wav", audioFormat: "wav", title: "Locked" })],
    support: supportMap([supportEntry("wav", [])]),
    handlers: { onCommit },
  });

  const cell = screen.getByText("Locked");
  fireEvent.doubleClick(cell);
  expect(screen.queryByDisplayValue("Locked")).toBeNull();
  expect(onCommit).not.toHaveBeenCalled();
});

it("ignores header clicks on cell-only columns and skips paste afterwards", async () => {
  const onPaste = vi.fn();
  vi.stubGlobal("navigator", {
    ...globalThis.navigator,
    clipboard: { readText: () => Promise.resolve("Alpha\nBeta") },
  });

  renderSpreadsheet({
    visibleIds: ["fileName", "lyrics"],
    rows: [
      buildRow({ filePath: "/a.mp3", audioFormat: "mp3" }),
      buildRow({ filePath: "/b.mp3", audioFormat: "mp3" }),
    ],
    support: supportMap([{ ...supportEntry("mp3", []), supportsLyrics: true }]),
    handlers: { onPaste },
  });

  const header = screen.getByText("Lyrics", { selector: "span.font-medium" });
  const headerCell = header.closest("th") as HTMLTableCellElement;
  expect(headerCell.title).toMatch(/cell only/i);
  expect(headerCell.className).toContain("cursor-default");
  fireEvent.click(header);
  fireEvent.keyDown(document, { key: "v", ctrlKey: true });
  await Promise.resolve();
  expect(onPaste).not.toHaveBeenCalled();
});

it("requests a paste with the selected column id when Cmd+V fires", async () => {
  const onPaste = vi.fn();
  vi.stubGlobal("navigator", {
    ...globalThis.navigator,
    clipboard: { readText: () => Promise.resolve("Alpha\nBeta") },
  });

  renderSpreadsheet({
    visibleIds: ["fileName", "tag.title"],
    rows: [
      buildRow({ filePath: "/a.mp3", audioFormat: "mp3", title: "A" }),
      buildRow({ filePath: "/b.mp3", audioFormat: "mp3", title: "B" }),
    ],
    support: supportMap([supportEntry("mp3", ["title"])]),
    handlers: { onPaste },
  });

  const header = screen.getByText("Title", { selector: "span.font-medium" });
  fireEvent.click(header);
  fireEvent.keyDown(document, { key: "v", ctrlKey: true });
  // Flush the clipboard read promise.
  await Promise.resolve();
  expect(onPaste).toHaveBeenCalledWith(
    expect.objectContaining({
      columnId: "tag.title",
      clipboardText: "Alpha\nBeta",
      baseRowIndex: 0,
      maxRows: 2,
      mode: "column",
    }),
  );
});
