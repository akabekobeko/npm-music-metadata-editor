import { expect, it } from "vitest";
import { readInvolvedPeopleRole } from "./readInvolvedPeopleRole.js";

it("returns the name registered under the role", () => {
  const values = ["engineer", "Bob", "producer", "Alice"];
  expect(readInvolvedPeopleRole(values, "producer")).toBe("Alice");
});

it("matches roles case-insensitively", () => {
  expect(readInvolvedPeopleRole(["Producer", "Alice"], "producer")).toBe("Alice");
});

it("returns undefined when the role is absent", () => {
  expect(readInvolvedPeopleRole(["engineer", "Bob"], "producer")).toBeUndefined();
});

it("skips entries with an empty name and keeps looking", () => {
  const values = ["producer", "", "producer", "Alice"];
  expect(readInvolvedPeopleRole(values, "producer")).toBe("Alice");
});

it("ignores a trailing unpaired value", () => {
  expect(readInvolvedPeopleRole(["producer"], "producer")).toBeUndefined();
});
