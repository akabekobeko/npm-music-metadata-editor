import { type DragEvent as ReactDragEvent, useCallback, useState } from "react";

import { type DropSide, reorderColumnIds } from "@/features/spreadsheet/reorderColumnIds";
import type { ColumnId } from "@/features/spreadsheet/types";

/** Column ids that must stay anchored at the left edge of the grid. */
const PINNED_COLUMN_IDS: ReadonlySet<ColumnId> = new Set<ColumnId>(["fileName"]);

/** Args for {@link useColumnDragAndDrop}. */
type Args = {
  /** Visible column ids in display order — drives the reorder calculation. */
  readonly visibleIds: readonly ColumnId[];
  /** Persistence callback fired once per successful drop. */
  readonly onColumnReorder: (orderedIds: readonly ColumnId[]) => void;
};

/** Public surface returned by {@link useColumnDragAndDrop}. */
export type ColumnDragAndDrop = {
  /** Column id currently being dragged, or `null` when idle. */
  readonly draggingId: ColumnId | null;
  /** Column id currently hovered as a drop target, or `null` when none. */
  readonly dropTargetId: ColumnId | null;
  /** Which side of the drop target should receive the source on `drop`. */
  readonly dropSide: DropSide | null;
  /** Whether the column id can be dragged at all (pinned columns return `false`). */
  readonly canDrag: (columnId: ColumnId) => boolean;
  /** Drag-source handler — attaches to the `<th>` `onDragStart`. */
  readonly onDragStart: (event: ReactDragEvent<HTMLElement>, columnId: ColumnId) => void;
  /**
   * Drop-target enter handler — attaches to the `<th>` `onDragEnter`.
   * Chromium requires `preventDefault()` on `dragenter` as well as `dragover`
   * for the very first frame of a hover to register as a valid drop target.
   */
  readonly onDragEnter: (event: ReactDragEvent<HTMLElement>, columnId: ColumnId) => void;
  /**
   * Drop-target handler — attaches to the `<th>` `onDragOver`. Re-computes
   * `dropSide` from the pointer's x-position relative to the target's bounding
   * box, snapping to `"after"` for pinned columns so the source cannot land
   * in front of them.
   */
  readonly onDragOver: (event: ReactDragEvent<HTMLElement>, columnId: ColumnId) => void;
  /**
   * Drop-target leave handler — clears the drop indicator only when the
   * pointer truly leaves the `<th>` (and not when it moves to a child node).
   */
  readonly onDragLeave: (event: ReactDragEvent<HTMLElement>, columnId: ColumnId) => void;
  /** Drop handler — fires `onColumnReorder` with the new ordered ids. */
  readonly onDrop: (event: ReactDragEvent<HTMLElement>, columnId: ColumnId) => void;
  /** Drag-source end handler — clears all transient drag state. */
  readonly onDragEnd: () => void;
};

/**
 * Drive header drag-and-drop reordering.
 *
 * Owns the transient drag state (`draggingId`, `dropTargetId`, `dropSide`)
 * and produces the handlers `SpreadsheetHeader` attaches to each `<th>`. The
 * reorder calculation itself is delegated to `reorderColumnIds` so the rule
 * (lift source, re-insert on chosen side) is testable in isolation.
 *
 * Pinned columns (`fileName`) cannot be dragged and cannot receive a drop
 * "before" — the helper transparently rewrites that case to "after" so callers
 * do not need to special-case it.
 *
 * @param args - Visible ids and the persistence callback.
 * @returns The drag state plus the per-handler callbacks.
 */
export const useColumnDragAndDrop = ({ visibleIds, onColumnReorder }: Args): ColumnDragAndDrop => {
  const [draggingId, setDraggingId] = useState<ColumnId | null>(null);
  const [dropTargetId, setDropTargetId] = useState<ColumnId | null>(null);
  const [dropSide, setDropSide] = useState<DropSide | null>(null);

  const reset = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
    setDropSide(null);
  }, []);

  const canDrag = useCallback(
    (columnId: ColumnId): boolean => !PINNED_COLUMN_IDS.has(columnId),
    [],
  );

  const onDragStart = useCallback(
    (event: ReactDragEvent<HTMLElement>, columnId: ColumnId): void => {
      if (!canDrag(columnId)) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = "move";
      // Firefox requires a non-empty payload to initiate a drag.
      event.dataTransfer.setData("text/plain", columnId);
      setDraggingId(columnId);
    },
    [canDrag],
  );

  const onDragEnter = useCallback(
    (event: ReactDragEvent<HTMLElement>, _columnId: ColumnId): void => {
      if (draggingId === null) {
        return;
      }
      // Chromium needs `preventDefault()` on both `dragenter` and `dragover`
      // for the drop to be considered valid on the very first frame.
      event.preventDefault();
    },
    [draggingId],
  );

  const onDragOver = useCallback(
    (event: ReactDragEvent<HTMLElement>, columnId: ColumnId): void => {
      if (draggingId === null) {
        return;
      }
      // `preventDefault()` must run on every `dragover` to keep `drop` allowed;
      // calling it before any other work avoids skipping the call on early
      // returns from later branches.
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";

      const rect = event.currentTarget.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      let side: DropSide = event.clientX < midX ? "before" : "after";
      if (PINNED_COLUMN_IDS.has(columnId)) {
        side = "after";
      }

      if (columnId !== dropTargetId) {
        setDropTargetId(columnId);
      }
      if (side !== dropSide) {
        setDropSide(side);
      }
    },
    [draggingId, dropTargetId, dropSide],
  );

  const onDragLeave = useCallback(
    (event: ReactDragEvent<HTMLElement>, columnId: ColumnId): void => {
      // Only clear when the pointer leaves the `<th>` itself, not when it
      // moves onto a child node like the resize gripper.
      const next = event.relatedTarget as Node | null;
      if (next !== null && event.currentTarget.contains(next)) {
        return;
      }
      if (dropTargetId === columnId) {
        setDropTargetId(null);
        setDropSide(null);
      }
    },
    [dropTargetId],
  );

  const onDrop = useCallback(
    (event: ReactDragEvent<HTMLElement>, columnId: ColumnId): void => {
      // Always call `preventDefault()` on `drop` so the browser does not
      // attempt to navigate to the dragged payload as a URL.
      event.preventDefault();
      if (draggingId === null) {
        reset();
        return;
      }

      const side: DropSide = PINNED_COLUMN_IDS.has(columnId) ? "after" : (dropSide ?? "after");
      const next = reorderColumnIds({
        ids: visibleIds,
        sourceId: draggingId,
        targetId: columnId,
        side,
      });
      reset();
      if (next !== visibleIds) {
        onColumnReorder(next);
      }
    },
    [draggingId, dropSide, visibleIds, onColumnReorder, reset],
  );

  const onDragEnd = useCallback((): void => {
    reset();
  }, [reset]);

  return {
    draggingId,
    dropTargetId,
    dropSide,
    canDrag,
    onDragStart,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
  };
};
