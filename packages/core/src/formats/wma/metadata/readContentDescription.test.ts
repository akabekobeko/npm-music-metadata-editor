import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { readContentDescription } from "./readContentDescription.js";
import { writeContentDescription } from "./writeContentDescription.js";

it("round-trips the five Content Description fields", () => {
  const sample = {
    title: "Hello",
    author: "Artist",
    copyright: "© 2026",
    description: "First WMA fixture",
    rating: "5",
  };
  const payload = writeContentDescription(sample);
  expect(readContentDescription(payload)).toEqual(sample);
});

it("treats empty fields as empty strings", () => {
  const empty = readContentDescription(Buffer.alloc(10));
  expect(empty).toEqual({ title: "", author: "", copyright: "", description: "", rating: "" });
});

it("returns empty fields when the input is shorter than the length table", () => {
  expect(readContentDescription(new Uint8Array(4))).toEqual({
    title: "",
    author: "",
    copyright: "",
    description: "",
    rating: "",
  });
});
