import { type PointerEvent as ReactPointerEvent, useCallback, useMemo, useState } from "react";

import type { ColumnId } from "@/features/spreadsheet/types";

/** Lower bound enforced while dragging a column resize handle. */
const MIN_RESIZE_WIDTH = 48;

/** Args for {@link useColumnResize}. */
type Args = {
  /** Persisted widths from settings, indexed by column id. */
  readonly baseWidths: Readonly<Record<ColumnId, number>>;
  /** Persistence callback fired once per drag end. */
  readonly onColumnResize: (columnId: ColumnId, width: number) => void;
};

/** Public surface returned by {@link useColumnResize}. */
export type ColumnResize = {
  /** Widths used for render — equals `baseWidths` except while a drag is in flight. */
  readonly liveWidths: Readonly<Record<ColumnId, number>>;
  /** Pointer-down handler to attach to each header's resize gripper. */
  readonly beginResize: (event: ReactPointerEvent<HTMLElement>, columnId: ColumnId) => void;
};

/**
 * Drive the column-resize interaction.
 *
 * Owns two pieces of state:
 *   1. `liveWidths` — what the grid renders during a drag (one column's
 *      width is "in flight" until pointerup commits it).
 *   2. The transient pointer-listener bound to `window` while the user is
 *      actively dragging.
 *
 * Persistence is debounced one step further upstream — `onColumnResize`
 * arrives in the host, which feeds `setSettings({ columns: { widths } })`,
 * and the Main process collapses the bursts into a single disk write.
 *
 * @param args - Persisted widths and the persistence callback.
 * @returns `liveWidths` for render and a `beginResize(event, columnId)`
 *   handler to attach to each header's resize gripper.
 */
export const useColumnResize = ({ baseWidths, onColumnResize }: Args): ColumnResize => {
  const [override, setOverride] = useState<{
    readonly columnId: ColumnId;
    readonly width: number;
  } | null>(null);

  const liveWidths = useMemo(() => {
    if (override === null) {
      return baseWidths;
    }

    return { ...baseWidths, [override.columnId]: override.width };
  }, [baseWidths, override]);

  const beginResize = useCallback(
    (event: ReactPointerEvent<HTMLElement>, columnId: ColumnId): void => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startWidth = baseWidths[columnId] ?? 100;
      let lastWidth = startWidth;
      const handleMove = (moveEvent: globalThis.PointerEvent): void => {
        const delta = moveEvent.clientX - startX;
        lastWidth = Math.max(MIN_RESIZE_WIDTH, startWidth + delta);
        setOverride({ columnId, width: lastWidth });
      };
      const handleUp = (): void => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        setOverride(null);
        if (lastWidth !== startWidth) {
          onColumnResize(columnId, Math.round(lastWidth));
        }
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [baseWidths, onColumnResize],
  );

  return { liveWidths, beginResize };
};
