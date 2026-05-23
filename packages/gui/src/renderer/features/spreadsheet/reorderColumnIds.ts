import type { ColumnId } from "./types.js";

/**
 * Side of the target column where the dragged source should be inserted.
 *
 * `"before"` lands the source to the left of `targetId`, `"after"` to the
 * right. Pinned columns (currently `fileName`) collapse `"before"` to
 * `"after"` at the call site so the source can never land in front of them.
 */
export type DropSide = "before" | "after";

/** Args for {@link reorderColumnIds}. */
export type ReorderColumnIdsArgs = {
  /** Current ordered column ids. */
  readonly ids: readonly ColumnId[];
  /** Column being dragged. */
  readonly sourceId: ColumnId;
  /** Column the pointer is currently hovering over. */
  readonly targetId: ColumnId;
  /** Whether to drop before or after the target. */
  readonly side: DropSide;
};

/**
 * Reorder `ids` by lifting `sourceId` out of its current position and
 * re-inserting it on the chosen side of `targetId`.
 *
 * Returns the original tuple untouched when the move is a no-op
 * (`sourceId === targetId`, `targetId` is not present, or the re-inserted
 * order is identical to `ids`). Callers are responsible for ensuring
 * `fileName` stays anchored — this helper preserves whichever order the
 * caller passes.
 *
 * @returns The reordered id list, or `ids` when nothing would change.
 */
export const reorderColumnIds = ({
  ids,
  sourceId,
  targetId,
  side,
}: ReorderColumnIdsArgs): readonly ColumnId[] => {
  if (sourceId === targetId) {
    return ids;
  }

  const withoutSource = ids.filter((id) => id !== sourceId);
  const targetIndex = withoutSource.indexOf(targetId);
  if (targetIndex === -1) {
    return ids;
  }

  const insertAt = side === "before" ? targetIndex : targetIndex + 1;
  const next = [...withoutSource.slice(0, insertAt), sourceId, ...withoutSource.slice(insertAt)];

  let unchanged = next.length === ids.length;
  if (unchanged) {
    for (let i = 0; i < ids.length; i += 1) {
      if (ids[i] !== next[i]) {
        unchanged = false;
        break;
      }
    }
  }

  return unchanged ? ids : next;
};
