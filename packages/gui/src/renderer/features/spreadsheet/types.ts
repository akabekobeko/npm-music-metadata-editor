import type { AudioFormat, FormatSupportEntry, TagData } from "@mme/ipc";
import type { ReactNode } from "react";
import type { TrackRow } from "../tracks/types.js";

/** Columns that don't map to a `TagData` field. */
type SimpleColumnId =
  | "fileName"
  | "audioFormat"
  | "durationMs"
  | "warnings"
  | "pictures"
  | "lyrics"
  | "chapters";

/**
 * Tag column ids derived from the keys of {@link TagData}.
 *
 * Adding a new field to `TagData` in core widens this union, which forces a
 * matching entry in `COLUMN_REGISTRY` (compile error until added) — that is
 * the desired feedback loop, not a bug.
 */
type TagColumnId = `tag.${keyof TagData & string}`;

/** Identifier of a column displayed in the spreadsheet. */
export type ColumnId = SimpleColumnId | TagColumnId;

/**
 * Whether a column is editable, and how:
 *
 * - `"never"` — display-only (file name, format, duration, warnings, chapters).
 * - `"tag"`   — inline cell editing of a `TagData` field (Phase 4).
 * - `"modal"` — dialog editing (pictures / lyrics in Phase 5).
 */
export type ColumnEditability = "never" | "tag" | "modal";

/**
 * Whether a column reacts to header clicks with column-wide selection.
 *
 * - `"column"`    — default. Header click selects the whole column, enabling
 *   the Phase 4 "1 value pasted = broadcast to every row" workflow.
 * - `"cell-only"` — header click is a no-op. Use for columns whose values may
 *   contain newlines (`lyrics`) or whose payload is opaque to text paste
 *   (`pictures`); editing happens through dedicated modals or per-cell focus.
 */
export type ColumnSelectability = "column" | "cell-only";

/**
 * Input flavour of an editable cell.
 *
 * Used by the cell editor (Phase 4) to pick between `<Input />`, `<Input
 * type="number" />`, `<Combobox />`, an ISO-8601 date validator, or a fully
 * custom React component.
 */
export type InputKind = "text" | "number" | "select" | "date" | "custom";

/** Option entry for `inputKind === "select"` columns. */
export type SelectOption = {
  /** Underlying value committed to the tag field. */
  readonly value: string;
  /** Human-readable label shown in the dropdown. */
  readonly label: string;
};

/**
 * Props handed to a column-specific cell editor.
 *
 * Phase 3 only fixes the type so that custom editors (e.g. `<RatingEditor />`)
 * can be declared up front; Phase 4 wires them to the spreadsheet selection
 * model.
 */
export type CellEditorProps = {
  /** Row whose cell is being edited. */
  readonly row: TrackRow;
  /** Current cell value (already projected through `readValue`). */
  readonly value: string | number | undefined;
  /** Commit a new value and exit edit mode. */
  readonly commit: (next: string | number | undefined) => void;
  /** Discard the editor without committing. */
  readonly cancel: () => void;
  /** When `true`, the editor renders read-only. */
  readonly disabled: boolean;
};

/**
 * Definition of one column rendered by the spreadsheet.
 *
 * `inputKind` / `options` / `editor` are populated only when `editable === "tag"`.
 * The renderer ignores them for `"never"` / `"modal"` columns.
 */
export type ColumnDefinition = {
  /** Stable column identifier. */
  readonly id: ColumnId;
  /** Header label shown in the grid. */
  readonly title: string;
  /** Default column width in pixels (registry default; overridden by settings). */
  readonly width: number;
  /** How the column behaves in edit mode. */
  readonly editable: ColumnEditability;
  /** When `"left"`, the column is pinned to the left edge of the viewport. */
  readonly sticky?: "left";
  /**
   * Whether the header allows column-wide selection. Defaults to `"column"`
   * (the Phase 4 behaviour); set to `"cell-only"` for columns that should
   * never broadcast a single pasted value across every row (`lyrics`,
   * `pictures`).
   */
  readonly selectable?: ColumnSelectability;
  /** Project a row to the cell's display value. */
  readonly readValue: (row: TrackRow) => string | number | undefined;
  /** Editor flavour used when `editable === "tag"`. */
  readonly inputKind?: InputKind;
  /** Suggestion list for `inputKind === "select"`. */
  readonly options?: readonly SelectOption[];
  /** Optional custom React editor — overrides the default `inputKind` editor. */
  readonly editor?: (props: CellEditorProps) => ReactNode;
};

/** Format support map keyed by {@link AudioFormat}. */
export type FormatSupportMap = ReadonlyMap<AudioFormat, FormatSupportEntry>;
