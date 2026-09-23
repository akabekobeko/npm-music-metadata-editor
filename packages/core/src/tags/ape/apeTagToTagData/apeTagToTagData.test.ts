import { expect, it } from "vitest";
import { ApeItemKind, ApeVersion } from "../constants.js";
import type { ApeItem, ApeTag } from "../types.js";
import { apeTagToTagData } from "./apeTagToTagData.js";

const textItem = (key: string, value: string): ApeItem => ({
  key,
  value,
  kind: ApeItemKind.Text,
  readOnly: false,
});

const tagOf = (...items: ApeItem[]): ApeTag => ({
  version: ApeVersion.V2,
  hasHeader: true,
  items,
  totalSize: 0,
});

it("decodes Rating on the 0..100 scale", () => {
  expect(apeTagToTagData(tagOf(textItem("Rating", "70"))).rating).toBeCloseTo(0.7, 10);
});

it("accepts the Preference alias and star-scale values", () => {
  expect(apeTagToTagData(tagOf(textItem("Preference", "3"))).rating).toBeCloseTo(0.6, 10);
});

it("keeps the first rating item and ignores non-numeric values", () => {
  expect(
    apeTagToTagData(tagOf(textItem("Rating", "20"), textItem("Preference", "90"))).rating,
  ).toBeCloseTo(0.2, 10);
  expect(apeTagToTagData(tagOf(textItem("Rating", "great"))).rating).toBeUndefined();
});
