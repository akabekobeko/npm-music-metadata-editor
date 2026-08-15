import { expect, it } from "vitest";
import { replaceInvolvedPeopleRole } from "./replaceInvolvedPeopleRole.js";

it("replaces the existing entry and keeps other roles in order", () => {
  const result = replaceInvolvedPeopleRole({
    values: ["engineer", "Bob", "producer", "Old", "mix", "Carol"],
    role: "producer",
    name: "New",
  });
  expect(result).toEqual(["engineer", "Bob", "mix", "Carol", "producer", "New"]);
});

it("appends the pair when the role is absent", () => {
  const result = replaceInvolvedPeopleRole({
    values: ["engineer", "Bob"],
    role: "producer",
    name: "Alice",
  });
  expect(result).toEqual(["engineer", "Bob", "producer", "Alice"]);
});

it("removes the role without re-adding it when the name is empty", () => {
  const result = replaceInvolvedPeopleRole({
    values: ["producer", "Alice", "engineer", "Bob"],
    role: "producer",
    name: "",
  });
  expect(result).toEqual(["engineer", "Bob"]);
});

it("matches roles case-insensitively", () => {
  const result = replaceInvolvedPeopleRole({
    values: ["Producer", "Old"],
    role: "producer",
    name: "New",
  });
  expect(result).toEqual(["producer", "New"]);
});

it("drops a trailing unpaired value", () => {
  const result = replaceInvolvedPeopleRole({
    values: ["engineer", "Bob", "orphan"],
    role: "producer",
    name: "Alice",
  });
  expect(result).toEqual(["engineer", "Bob", "producer", "Alice"]);
});
