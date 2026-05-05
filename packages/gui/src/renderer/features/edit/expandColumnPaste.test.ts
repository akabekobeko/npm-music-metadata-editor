import { expect, it } from "vitest";
import { expandColumnPaste } from "./expandColumnPaste";

it("broadcasts a 1-value column paste across every row", () => {
  expect(expandColumnPaste({ values: ["X"], mode: "column", totalRows: 3 })).toEqual([
    "X",
    "X",
    "X",
  ]);
});

it("keeps multi-value column pastes unchanged (1:1 mapping wins)", () => {
  expect(expandColumnPaste({ values: ["A", "B"], mode: "column", totalRows: 5 })).toEqual([
    "A",
    "B",
  ]);
});

it("never broadcasts under a cell selection", () => {
  expect(expandColumnPaste({ values: ["X"], mode: "cell", totalRows: 3 })).toEqual(["X"]);
});

it("returns the input untouched when there are no rows to fill", () => {
  expect(expandColumnPaste({ values: ["X"], mode: "column", totalRows: 0 })).toEqual(["X"]);
});

it("returns the input untouched for an empty clipboard", () => {
  expect(expandColumnPaste({ values: [], mode: "column", totalRows: 3 })).toEqual([]);
});
