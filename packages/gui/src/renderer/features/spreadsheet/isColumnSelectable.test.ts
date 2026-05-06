import { expect, it } from "vitest";
import { isColumnSelectable } from "./isColumnSelectable";
import type { ColumnDefinition } from "./types";

const baseColumn: ColumnDefinition = {
  id: "tag.title",
  title: "Title",
  width: 240,
  editable: "tag",
  readValue: () => undefined,
  inputKind: "text",
};

it("treats columns without `selectable` as column-selectable", () => {
  expect(isColumnSelectable(baseColumn)).toBe(true);
});

it('treats `selectable: "column"` as selectable', () => {
  expect(isColumnSelectable({ ...baseColumn, selectable: "column" })).toBe(true);
});

it('treats `selectable: "cell-only"` as not selectable', () => {
  expect(isColumnSelectable({ ...baseColumn, selectable: "cell-only" })).toBe(false);
});
