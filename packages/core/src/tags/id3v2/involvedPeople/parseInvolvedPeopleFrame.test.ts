import { expect, it } from "vitest";
import { buildTextFrameBody } from "../buildId3v2/buildTextFrameBody.js";
import { parseInvolvedPeopleFrame } from "./parseInvolvedPeopleFrame.js";

it("splits null-separated role/name values (utf8)", () => {
  const body = buildTextFrameBody({
    encoding: "utf8",
    text: "producer\u0000Alice\u0000engineer\u0000Bob",
  });
  expect(parseInvolvedPeopleFrame(body)).toEqual(["producer", "Alice", "engineer", "Bob"]);
});

it("splits null-separated role/name values (latin1)", () => {
  const body = buildTextFrameBody({ encoding: "latin1", text: "producer\u0000Alice" });
  expect(parseInvolvedPeopleFrame(body)).toEqual(["producer", "Alice"]);
});

it("splits utf16 values on aligned double-null separators", () => {
  const body = buildTextFrameBody({
    encoding: "utf16",
    text: "producer\u0000プロデューサー",
  });
  expect(parseInvolvedPeopleFrame(body)).toEqual(["producer", "プロデューサー"]);
});

it("strips a trailing terminator before splitting", () => {
  const withoutTerminator = buildTextFrameBody({ encoding: "utf8", text: "producer\u0000Alice" });
  const body = new Uint8Array(withoutTerminator.length + 1);
  body.set(withoutTerminator, 0);
  expect(parseInvolvedPeopleFrame(body)).toEqual(["producer", "Alice"]);
});

it("returns an empty list for an empty body", () => {
  expect(parseInvolvedPeopleFrame(new Uint8Array())).toEqual([]);
});

it("returns an empty list for an unknown encoding byte", () => {
  expect(parseInvolvedPeopleFrame(Uint8Array.from([0x0f, 0x41]))).toEqual([]);
});
