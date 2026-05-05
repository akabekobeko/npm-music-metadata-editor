import { basename } from "../../libs/basename.js";
import { formatDuration } from "../tracks/formatDuration.js";
import { summarizeLyrics } from "../tracks/summarizeLyrics.js";
import { summarizePictures } from "../tracks/summarizePictures.js";
import { summarizeWarnings } from "../tracks/summarizeWarnings.js";
import type { TrackRow } from "../tracks/types.js";
import type { ColumnDefinition, ColumnId, SelectOption } from "./types.js";

/**
 * Free-form genre suggestions surfaced by the `tag.genre` combobox.
 *
 * Phase 3 uses a small representative set; Phase 6 widens it to the persisted
 * user list (history + custom additions).
 */
const GENRE_OPTIONS: readonly SelectOption[] = [
  "Rock",
  "Pop",
  "Jazz",
  "Classical",
  "Electronic",
  "Hip-Hop",
  "R&B",
  "Folk",
  "Country",
  "Soundtrack",
].map((value) => ({ value, label: value }));

/**
 * ISO-639 suggestions for the `tag.language` combobox.
 *
 * Mirrors the ATL.NET reference list. Free input is still allowed, so missing
 * codes do not block writing.
 */
const LANGUAGE_OPTIONS: readonly SelectOption[] = [
  { value: "eng", label: "English (eng)" },
  { value: "jpn", label: "Japanese (jpn)" },
  { value: "fra", label: "French (fra)" },
  { value: "deu", label: "German (deu)" },
  { value: "spa", label: "Spanish (spa)" },
  { value: "ita", label: "Italian (ita)" },
  { value: "kor", label: "Korean (kor)" },
  { value: "zho", label: "Chinese (zho)" },
  { value: "rus", label: "Russian (rus)" },
  { value: "por", label: "Portuguese (por)" },
];

type TagColumnArgs = {
  /** Column id (always starts with `tag.`). */
  readonly id: ColumnId;
  /** Header label. */
  readonly title: string;
  /** Column width in pixels. */
  readonly width: number;
  /** Reader projecting the row to the cell's display value. */
  readonly readValue: (row: TrackRow) => string | number | undefined;
  /** Editor flavour activated in Phase 4. */
  readonly inputKind: ColumnDefinition["inputKind"];
  /** Suggestion list for `inputKind === "select"`. */
  readonly options?: readonly SelectOption[];
};

/**
 * Build a `ColumnDefinition` for a `tag.<field>` column.
 *
 * Centralizing the editable/readonly/inputKind shape here keeps the registry
 * below readable: each entry only declares what is unique about that field.
 *
 * @returns Column definition ready to be merged into {@link COLUMN_REGISTRY}.
 */
const tagColumn = ({
  id,
  title,
  width,
  readValue,
  inputKind,
  options,
}: TagColumnArgs): ColumnDefinition => ({
  id,
  title,
  width,
  editable: "tag",
  readValue,
  inputKind,
  ...(options !== undefined ? { options } : {}),
});

/**
 * Lookup table of every column the spreadsheet knows about.
 *
 * The renderer derives the visible columns from this table via `buildColumns`,
 * so editing a column's metadata (label / width / `inputKind`) updates the grid
 * in one place. The keys exhaust {@link ColumnId}; widening `TagData` in core
 * trips a type error here until the matching entry is added.
 */
export const COLUMN_REGISTRY: Readonly<Record<ColumnId, ColumnDefinition>> = {
  fileName: {
    id: "fileName",
    title: "File",
    width: 240,
    editable: "never",
    sticky: "left",
    readValue: (row) => basename(row.filePath),
  },
  audioFormat: {
    id: "audioFormat",
    title: "Format",
    width: 80,
    editable: "never",
    readValue: (row) => row.track.audioFormat,
  },
  durationMs: {
    id: "durationMs",
    title: "Duration",
    width: 88,
    editable: "never",
    readValue: (row) => formatDuration(row.track.durationMs),
  },
  warnings: {
    id: "warnings",
    title: "!",
    width: 56,
    editable: "never",
    readValue: (row) => summarizeWarnings(row.track.warnings).label,
  },
  pictures: {
    id: "pictures",
    title: "Pictures",
    width: 110,
    editable: "modal",
    readValue: (row) => summarizePictures(row.track.pictures).label,
  },
  lyrics: {
    id: "lyrics",
    title: "Lyrics",
    width: 96,
    editable: "modal",
    readValue: (row) => summarizeLyrics(row.track.lyrics).label,
  },
  chapters: {
    id: "chapters",
    title: "Chapters",
    width: 80,
    editable: "never",
    readValue: (row) => (row.track.chapters.length === 0 ? undefined : row.track.chapters.length),
  },

  "tag.title": tagColumn({
    id: "tag.title",
    title: "Title",
    width: 240,
    readValue: (row) => row.track.tag.title,
    inputKind: "text",
  }),
  "tag.artist": tagColumn({
    id: "tag.artist",
    title: "Artist",
    width: 200,
    readValue: (row) => row.track.tag.artist,
    inputKind: "text",
  }),
  "tag.album": tagColumn({
    id: "tag.album",
    title: "Album",
    width: 200,
    readValue: (row) => row.track.tag.album,
    inputKind: "text",
  }),
  "tag.albumArtist": tagColumn({
    id: "tag.albumArtist",
    title: "Album Artist",
    width: 180,
    readValue: (row) => row.track.tag.albumArtist,
    inputKind: "text",
  }),
  "tag.composer": tagColumn({
    id: "tag.composer",
    title: "Composer",
    width: 160,
    readValue: (row) => row.track.tag.composer,
    inputKind: "text",
  }),
  "tag.conductor": tagColumn({
    id: "tag.conductor",
    title: "Conductor",
    width: 160,
    readValue: (row) => row.track.tag.conductor,
    inputKind: "text",
  }),
  "tag.lyricist": tagColumn({
    id: "tag.lyricist",
    title: "Lyricist",
    width: 160,
    readValue: (row) => row.track.tag.lyricist,
    inputKind: "text",
  }),
  "tag.publisher": tagColumn({
    id: "tag.publisher",
    title: "Publisher",
    width: 160,
    readValue: (row) => row.track.tag.publisher,
    inputKind: "text",
  }),
  "tag.copyright": tagColumn({
    id: "tag.copyright",
    title: "Copyright",
    width: 160,
    readValue: (row) => row.track.tag.copyright,
    inputKind: "text",
  }),
  "tag.comment": tagColumn({
    id: "tag.comment",
    title: "Comment",
    width: 220,
    readValue: (row) => row.track.tag.comment,
    inputKind: "text",
  }),
  "tag.genre": tagColumn({
    id: "tag.genre",
    title: "Genre",
    width: 140,
    readValue: (row) => row.track.tag.genre,
    inputKind: "select",
    options: GENRE_OPTIONS,
  }),
  "tag.group": tagColumn({
    id: "tag.group",
    title: "Group",
    width: 140,
    readValue: (row) => row.track.tag.group,
    inputKind: "text",
  }),
  "tag.description": tagColumn({
    id: "tag.description",
    title: "Description",
    width: 220,
    readValue: (row) => row.track.tag.description,
    inputKind: "text",
  }),
  "tag.language": tagColumn({
    id: "tag.language",
    title: "Language",
    width: 120,
    readValue: (row) => row.track.tag.language,
    inputKind: "select",
    options: LANGUAGE_OPTIONS,
  }),
  "tag.isrc": tagColumn({
    id: "tag.isrc",
    title: "ISRC",
    width: 140,
    readValue: (row) => row.track.tag.isrc,
    inputKind: "text",
  }),
  "tag.productId": tagColumn({
    id: "tag.productId",
    title: "Product ID",
    width: 140,
    readValue: (row) => row.track.tag.productId,
    inputKind: "text",
  }),
  "tag.year": tagColumn({
    id: "tag.year",
    title: "Year",
    width: 80,
    readValue: (row) => row.track.tag.year,
    inputKind: "number",
  }),
  "tag.recordingDate": tagColumn({
    id: "tag.recordingDate",
    title: "Recording Date",
    width: 140,
    readValue: (row) => row.track.tag.recordingDate,
    inputKind: "date",
  }),
  "tag.originalReleaseDate": tagColumn({
    id: "tag.originalReleaseDate",
    title: "Original Release",
    width: 160,
    readValue: (row) => row.track.tag.originalReleaseDate,
    inputKind: "date",
  }),
  "tag.publishingDate": tagColumn({
    id: "tag.publishingDate",
    title: "Publishing Date",
    width: 140,
    readValue: (row) => row.track.tag.publishingDate,
    inputKind: "date",
  }),
  "tag.trackNumber": tagColumn({
    id: "tag.trackNumber",
    title: "Track #",
    width: 80,
    readValue: (row) => row.track.tag.trackNumber,
    inputKind: "number",
  }),
  "tag.trackTotal": tagColumn({
    id: "tag.trackTotal",
    title: "Tracks",
    width: 80,
    readValue: (row) => row.track.tag.trackTotal,
    inputKind: "number",
  }),
  "tag.discNumber": tagColumn({
    id: "tag.discNumber",
    title: "Disc #",
    width: 72,
    readValue: (row) => row.track.tag.discNumber,
    inputKind: "number",
  }),
  "tag.discTotal": tagColumn({
    id: "tag.discTotal",
    title: "Discs",
    width: 72,
    readValue: (row) => row.track.tag.discTotal,
    inputKind: "number",
  }),
  "tag.bpm": tagColumn({
    id: "tag.bpm",
    title: "BPM",
    width: 72,
    readValue: (row) => row.track.tag.bpm,
    inputKind: "number",
  }),
  "tag.rating": tagColumn({
    id: "tag.rating",
    title: "Rating",
    width: 96,
    readValue: (row) => row.track.tag.rating,
    inputKind: "custom",
  }),
};

/**
 * Visible column ids in the default spreadsheet layout.
 *
 * Phase 6 will replace this with a JSON-persisted user setting; until then the
 * default doubles as the "out of the box" column set referenced by the
 * `buildColumns` snapshot test.
 */
export const DEFAULT_VISIBLE_IDS: readonly ColumnId[] = [
  "fileName",
  "audioFormat",
  "durationMs",
  "tag.title",
  "tag.artist",
  "tag.album",
  "tag.albumArtist",
  "tag.trackNumber",
  "tag.year",
  "tag.genre",
  "pictures",
  "lyrics",
  "warnings",
];

/**
 * Every known column id, preserving the registry's declaration order.
 *
 * Used by the "show all columns" snapshot test and (Phase 6) by the column
 * picker UI as the catalog of switchable columns.
 */
export const ALL_COLUMN_IDS: readonly ColumnId[] = Object.keys(COLUMN_REGISTRY) as ColumnId[];
