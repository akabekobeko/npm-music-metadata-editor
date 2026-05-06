import { expect, it } from "vitest";
import type { ColumnDefinition } from "../spreadsheet/types.js";
import { MIN_COLUMN_WIDTH, resolveColumnWidths } from "./resolveColumnWidths.js";

const buildColumn = (id: string, width: number): ColumnDefinition => ({
  id: id as ColumnDefinition["id"],
  title: id,
  width,
  editable: "never",
  readValue: () => undefined,
});

it("falls back to the registry default when no user width is stored", () => {
  const columns = [buildColumn("fileName", 240), buildColumn("audioFormat", 80)];
  const widths = resolveColumnWidths(columns, {});
  expect(widths.fileName).toBe(240);
  expect(widths.audioFormat).toBe(80);
});

it("uses the persisted user width when present", () => {
  const columns = [buildColumn("fileName", 240)];
  const widths = resolveColumnWidths(columns, { fileName: 300 });
  expect(widths.fileName).toBe(300);
});

it("clamps up widths below MIN_COLUMN_WIDTH", () => {
  const columns = [buildColumn("fileName", 16)];
  const widths = resolveColumnWidths(columns, { fileName: 4 });
  expect(widths.fileName).toBe(MIN_COLUMN_WIDTH);
});

it("ignores invalid persisted widths", () => {
  const columns = [buildColumn("fileName", 240)];
  const widths = resolveColumnWidths(columns, {
    fileName: Number.NaN as unknown as number,
  });
  expect(widths.fileName).toBe(240);
});
