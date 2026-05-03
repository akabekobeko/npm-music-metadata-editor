import { readApeExtras } from "../../../extras/apeExtras/readApeExtras.js";
import { readId3v2Extras } from "../../../extras/id3v2Extras/readId3v2Extras.js";
import { apeTagToTagData } from "../../../tags/ape/apeTagToTagData/apeTagToTagData.js";
import { readApeTag } from "../../../tags/ape/readApeTag/readApeTag.js";
import { readId3v1 } from "../../../tags/id3v1/readId3v1/readId3v1.js";
import { id3v2TagToTagData } from "../../../tags/id3v2/id3v2TagToTagData/id3v2TagToTagData.js";
import { parseId3v2 } from "../../../tags/id3v2/parseId3v2/parseId3v2.js";
import type {
  ChapterInfo,
  LyricsInfo,
  MetadataReadResult,
  PictureInfo,
  ReadOptions,
  TagData,
  TagSource,
} from "../../../types.js";
import { computeDurationMs } from "./computeDurationMs.js";
import { id3v1ToTagData } from "./id3v1ToTagData.js";
import { mergeTags } from "./mergeTags.js";

/** Default order in which MP3 tag sources are consulted. */
const DEFAULT_TAG_PRIORITY: readonly TagSource[] = ["id3v2", "ape", "id3v1"];

/**
 * Read MP3 metadata.
 *
 * MP3 files may carry up to three concurrent tag flavours: ID3v2 (head), APE
 * Tag (tail, in front of any ID3v1), and ID3v1 (final 128 bytes). When more
 * than one is present the {@link ReadOptions.tagPriority} list controls
 * precedence — earlier sources win on field conflicts, later ones backfill.
 * The default order (`id3v2 → ape → id3v1`) matches ATL.NET.
 *
 * @param input - Whole-file bytes.
 * @param options - Reader options (currently `tagPriority` is honoured).
 * @returns A {@link MetadataReadResult} populated with the merged tag data.
 *   `pictures` / `chapters` / `lyrics` remain empty until Phase 9 lands the
 *   structural surfaces for APIC / CHAP / USLT etc.
 */
export const readMp3 = async (
  input: Uint8Array,
  options?: ReadOptions,
): Promise<MetadataReadResult> => {
  const priority = options?.tagPriority ?? DEFAULT_TAG_PRIORITY;
  const projections = priority.map((source) => projectTag({ source, input }));
  const tag = projections.reduce<TagData>((acc, projection) => mergeTags(acc, projection), {});

  const id3v2 = parseId3v2(input);
  const ape = readApeTag(input);
  const id3Extras = id3v2 === undefined ? undefined : readId3v2Extras(id3v2);
  const apeExtras = ape === undefined ? undefined : readApeExtras(ape);

  const pictures: PictureInfo[] = [...(id3Extras?.pictures ?? []), ...(apeExtras?.pictures ?? [])];
  const chapters: ChapterInfo[] = [...(id3Extras?.chapters ?? [])];
  const lyrics: LyricsInfo | undefined = id3Extras?.lyrics;

  const durationMs = computeDurationMs(input);

  return {
    audioFormat: "mp3",
    tag,
    pictures,
    chapters,
    ...(lyrics === undefined ? {} : { lyrics }),
    ...(durationMs === undefined ? {} : { durationMs }),
  };
};

/** Arguments for {@link projectTag}. */
type Args = {
  /** Tag source to read. */
  source: TagSource;
  /** Whole-file bytes. */
  input: Uint8Array;
};

/**
 * Resolve the {@link TagData} projection for a single tag source.
 *
 * Returns an empty object when the requested source is missing so the merge
 * step can run unconditionally without per-source guards.
 *
 * @returns A `TagData` projection (empty when the source is absent).
 */
const projectTag = ({ source, input }: Args): TagData => {
  if (source === "id3v2") {
    const id3v2 = parseId3v2(input);
    return id3v2 === undefined ? {} : id3v2TagToTagData(id3v2);
  }

  if (source === "ape") {
    const ape = readApeTag(input);
    return ape === undefined ? {} : apeTagToTagData(ape);
  }

  return id3v1ToTagData(readId3v1(input));
};
