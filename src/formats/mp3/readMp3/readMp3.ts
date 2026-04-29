import { readId3v1 } from "../../../tags/id3v1/readId3v1/readId3v1.js";
import { id3v2TagToTagData } from "../../../tags/id3v2/id3v2TagToTagData/id3v2TagToTagData.js";
import { parseId3v2 } from "../../../tags/id3v2/parseId3v2/parseId3v2.js";
import type { MetadataReadResult } from "../../../types.js";
import { id3v1ToTagData } from "./id3v1ToTagData.js";
import { mergeTags } from "./mergeTags.js";

/**
 * Read MP3 metadata.
 *
 * Order: ID3v2 (head) → ID3v1 (tail). When both are present, ID3v2 wins on
 * field conflicts; ID3v1 only fills in fields that ID3v2 left blank.
 *
 * @param input - Whole-file bytes.
 * @returns A {@link MetadataReadResult} populated with the merged tag data.
 *   `pictures` / `chapters` / `lyrics` remain empty in Phase 2 — APIC / CHAP /
 *   USLT structuring lands in Phase 9.
 */
export const readMp3 = async (input: Uint8Array): Promise<MetadataReadResult> => {
  const id3v2 = parseId3v2(input);
  const id3v1 = readId3v1(input);
  const merged = mergeTags(
    id3v2 === undefined ? {} : id3v2TagToTagData(id3v2),
    id3v1ToTagData(id3v1),
  );
  return {
    audioFormat: "mp3",
    tag: merged,
    pictures: [],
    chapters: [],
  };
};
