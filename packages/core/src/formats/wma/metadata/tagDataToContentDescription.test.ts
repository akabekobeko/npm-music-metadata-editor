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

it("blanks a slot instead of falling back when the field is null or empty", () => {
  const result = tagDataToContentDescription({
    tag: { title: null, artist: "" },
    existing: {
      title: "Old",
      author: "Existing",
      copyright: "(C)",
      description: "",
      rating: "",
    },
  });
  expect(result).toEqual({
    title: "",
    author: "",
    copyright: "(C)",
    description: "",
    rating: "",
  });
});

it("returns undefined when null markers empty out every slot", () => {
  const result = tagDataToContentDescription({
    tag: { title: null },
    existing: { title: "Old", author: "", copyright: "", description: "", rating: "" },
  });
  expect(result).toBeUndefined();
});
