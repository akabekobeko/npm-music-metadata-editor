import type { ReactNode } from "react";
import type { AudioFormat, FormatSupportEntry, TagData } from "../../../main/ipc/types.js";
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
 * Input flavour of an editable cell.
 *
 * Used by the cell editor (Phase 4) to pick between `<Input />`, `<Input
 * type="number" />`, `<Combobox />`, an ISO-8601 date validator, or a fully
 * custom React component.
 */
export type InputKind = "text" | "number" | "select" | "date" | "custom";

/** Option entry for `inputKind === "select"` columns. */
export type SelectOption = {
  readonly value: string;
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
  readonly row: TrackRow;
  readonly value: string | number | undefined;
  readonly commit: (next: string | number | undefined) => void;
  readonly cancel: () => void;
  readonly disabled: boolean;
};

/**
 * Definition of one column rendered by the spreadsheet.
 *
 * `inputKind` / `options` / `editor` are populated only when `editable === "tag"`.
 * The renderer ignores them for `"never"` / `"modal"` columns.
 */
export type ColumnDefinition = {
  readonly id: ColumnId;
  readonly title: string;
  readonly width: number;
  readonly editable: ColumnEditability;
  /** When `"left"`, the column is pinned to the left edge of the viewport. */
  readonly sticky?: "left";
  readonly readValue: (row: TrackRow) => string | number | undefined;
  readonly inputKind?: InputKind;
  readonly options?: readonly SelectOption[];
  readonly editor?: (props: CellEditorProps) => ReactNode;
};

/** Format support map keyed by {@link AudioFormat}. */
export type FormatSupportMap = ReadonlyMap<AudioFormat, FormatSupportEntry>;
