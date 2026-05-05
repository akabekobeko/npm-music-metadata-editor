import { expect, it } from "vitest";
import { buildLyricsInfoFromDraft } from "./buildLyricsInfoFromDraft.js";
import type { LyricsDraft } from "./types.js";

const emptyDraft: LyricsDraft = {
  language: "",
  description: "",
  unsynchronized: "",
  synchronized: [],
};

it("returns undefined when both lyric forms are empty", () => {
  expect(buildLyricsInfoFromDraft(emptyDraft)).toBeUndefined();
});

it("treats whitespace-only plain text as empty", () => {
  const draft: LyricsDraft = { ...emptyDraft, unsynchronized: "   \n  " };

  expect(buildLyricsInfoFromDraft(draft)).toBeUndefined();
});

it("emits a plain-text-only LyricsInfo", () => {
  const draft: LyricsDraft = {
    ...emptyDraft,
    language: "eng",
    unsynchronized: "Line 1\nLine 2",
  };
  const result = buildLyricsInfoFromDraft(draft);

  expect(result).toEqual({ language: "eng", unsynchronized: "Line 1\nLine 2" });
});

it("emits a synchronized-only LyricsInfo", () => {
  const draft: LyricsDraft = {
    ...emptyDraft,
    description: "Lyrics",
    synchronized: [{ timeMs: 0, text: "Hi" }],
  };
  const result = buildLyricsInfoFromDraft(draft);

  expect(result).toEqual({
    description: "Lyrics",
    synchronized: [{ timeMs: 0, text: "Hi" }],
  });
});

it("emits both forms when both are populated", () => {
  const draft: LyricsDraft = {
    language: "eng",
    description: "Lyrics",
    unsynchronized: "Plain",
    synchronized: [{ timeMs: 1_000, text: "Sync" }],
  };
  const result = buildLyricsInfoFromDraft(draft);

  expect(result).toEqual({
    language: "eng",
    description: "Lyrics",
    unsynchronized: "Plain",
    synchronized: [{ timeMs: 1_000, text: "Sync" }],
  });
});

it("trims surrounding whitespace from string fields but not the plain-text body", () => {
  const draft: LyricsDraft = {
    language: "  eng  ",
    description: "  Lyrics  ",
    unsynchronized: "  Body\nMore  ",
    synchronized: [],
  };
  const result = buildLyricsInfoFromDraft(draft);

  expect(result?.language).toBe("eng");
  expect(result?.description).toBe("Lyrics");
  expect(result?.unsynchronized).toBe("Body\nMore");
});
