import { Buffer } from "node:buffer";
import { parseFrame } from "../../../tags/id3v2/parseId3v2/parseFrame/parseFrame.js";
import { parseTextFrame } from "../../../tags/id3v2/parseId3v2/parseTextFrame/parseTextFrame.js";
import type { Id3v2MajorVersion } from "../../../tags/id3v2/types.js";
import type { ChapterInfo } from "../../../types.js";

/** Decoded `CTOC` frame body. */
export type CtocEntry = {
  /** Element ID of the table of contents (`"toc"` is the conventional value). */
  id: string;
  /** `true` when this CTOC is the top-level entry. */
  isTopLevel: boolean;
  /** `true` when child element IDs are listed in playback order. */
  ordered: boolean;
  /** Element IDs of the chapters / sub-tables this entry references. */
  childElementIds: readonly string[];
  /** Optional description (sourced from an embedded `TIT2` sub-frame). */
  description?: string;
};

/** Arguments for {@link decodeCtoc}. */
type DecodeArgs = {
  /** Frame body bytes (after unsync / data-length unwrap). */
  body: Uint8Array;
  /** Containing tag's major version (controls how embedded sub-frames parse). */
  majorVersion: Id3v2MajorVersion;
};

/**
 * Decode an ID3v2 `CTOC` frame body into a {@link CtocEntry}.
 *
 * Layout:
 * ```
 *   Element ID    (Latin-1, null-terminated)
 *   Flags         (1 byte: bit 0 = top-level, bit 1 = ordered)
 *   Entry count   (1 byte)
 *   Element IDs   (entry-count of Latin-1 null-terminated strings)
 *   Sub-frames    (typically TIT2 carrying the description)
 * ```
 *
 * @returns The decoded CTOC entry, or `undefined` when the body is malformed.
 */
export const decodeCtoc = ({ body, majorVersion }: DecodeArgs): CtocEntry | undefined => {
  const idEnd = body.indexOf(0x00);
  if (idEnd === -1 || idEnd + 3 > body.length) {
    return undefined;
  }

  const id = Buffer.from(body.subarray(0, idEnd)).toString("latin1");
  const flags = body[idEnd + 1] as number;
  const entryCount = body[idEnd + 2] as number;

  let cursor = idEnd + 3;
  const childElementIds: string[] = [];
  for (let i = 0; i < entryCount; i++) {
    const term = body.indexOf(0x00, cursor);
    if (term === -1) {
      return undefined;
    }

    childElementIds.push(Buffer.from(body.subarray(cursor, term)).toString("latin1"));
    cursor = term + 1;
  }

  let description: string | undefined;
  while (cursor < body.length) {
    const result = parseFrame({ body, offset: cursor, majorVersion });
    if (result.kind === "padding" || result.kind === "error") {
      break;
    }

    if (result.frame.id === "TIT2") {
      const text = parseTextFrame(result.frame.data);
      if (text !== undefined && text !== "") {
        description = text;
      }
    }

    cursor += result.consumed;
  }

  return {
    id,
    isTopLevel: (flags & 0x01) !== 0,
    ordered: (flags & 0x02) !== 0,
    childElementIds,
    description,
  };
};

/** Arguments for {@link buildChapterHierarchy}. */
type HierarchyArgs = {
  /** Decoded chapter list (in tag order, not yet nested). */
  chapters: readonly ChapterInfo[];
  /** Decoded CTOC entries in tag order. */
  ctocs: readonly CtocEntry[];
};

/**
 * Build the chapter tree implied by the CTOC entries.
 *
 * Strategy:
 * - When no CTOC frames are present, return the chapters as a flat list.
 * - Otherwise pick the top-level CTOC (the one whose element ID is referenced
 *   by no other CTOC, falling back to the entry with the `top-level` flag, and
 *   finally the first CTOC) and recursively project its child element IDs.
 * - Chapters / CTOCs not reachable from the top-level entry are appended at
 *   the end of the list so no input is silently dropped.
 *
 * Cycles are broken by tracking the elements already visited along the
 * current branch — a re-entry returns `undefined` and is skipped.
 *
 * @returns Top-level chapters with `subChapters` set on entries that referenced
 *   nested CTOC tables.
 */
export const buildChapterHierarchy = ({
  chapters,
  ctocs,
}: HierarchyArgs): readonly ChapterInfo[] => {
  if (ctocs.length === 0) {
    return chapters;
  }

  const chaptersById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const ctocsById = new Map(ctocs.map((ctoc) => [ctoc.id, ctoc]));

  const referencedByOtherCtoc = new Set<string>();
  for (const ctoc of ctocs) {
    for (const childId of ctoc.childElementIds) {
      if (ctocsById.has(childId)) {
        referencedByOtherCtoc.add(childId);
      }
    }
  }

  const root =
    ctocs.find((ctoc) => !referencedByOtherCtoc.has(ctoc.id) && ctoc.isTopLevel) ??
    ctocs.find((ctoc) => !referencedByOtherCtoc.has(ctoc.id)) ??
    ctocs[0];
  if (root === undefined) {
    return chapters;
  }

  const visited = new Set<string>();
  const expand = (childIds: readonly string[]): ChapterInfo[] => {
    const out: ChapterInfo[] = [];
    for (const childId of childIds) {
      if (visited.has(childId)) {
        continue;
      }

      visited.add(childId);
      const ctoc = ctocsById.get(childId);
      if (ctoc !== undefined) {
        out.push(...expand(ctoc.childElementIds));
        continue;
      }

      const chapter = chaptersById.get(childId);
      if (chapter !== undefined) {
        out.push(chapter);
      }
    }

    return out;
  };

  const top = expand(root.childElementIds);

  // Append leftovers (chapters not referenced by the chosen tree) so callers
  // never silently lose chapters from pathological tags.
  const orphans = chapters.filter((chapter) => !visited.has(chapter.id));
  return [...top, ...orphans];
};
