import { expect, it } from "vitest";
import { tagDataToContentDescription } from "./tagDataToContentDescription.js";

it("returns undefined when nothing maps onto Content Description", () => {
  expect(tagDataToContentDescription({ tag: {}, existing: undefined })).toBeUndefined();
});

it("falls back to the existing description when a field is omitted", () => {
  const result = tagDataToContentDescription({
    tag: { title: "Updated" },
    existing: {
      title: "Old",
      author: "Existing",
      copyright: "",
      description: "",
      rating: "",
    },
  });
  expect(result).toEqual({
    title: "Updated",
    author: "Existing",
    copyright: "",
    description: "",
    rating: "",
  });
});
