import type { TagData, Track } from "@akabeko/music-metadata-editor";

/** Arguments accepted by {@link formatPretty}. */
type Args = {
  /** Source `Track`. */
  readonly track: Track;
  /** When `true`, drop the `Warnings` section. */
  readonly noWarnings: boolean;
};

/**
 * Tag fields rendered in pretty mode, in the order documented by
 * `docs/field-mapping.md`. `trackNumber` / `trackTotal` and
 * `discNumber` / `discTotal` are merged into combined lines (`Track`,
 * `Disc`) below.
 */
const TAG_FIELDS: readonly { label: string; key: keyof TagData }[] = [
  { label: "Title", key: "title" },
  { label: "Artist", key: "artist" },
  { label: "Album Artist", key: "albumArtist" },
  { label: "Album", key: "album" },
  { label: "Composer", key: "composer" },
  { label: "Conductor", key: "conductor" },
  { label: "Lyricist", key: "lyricist" },
  { label: "Publisher", key: "publisher" },
  { label: "Copyright", key: "copyright" },
  { label: "Comment", key: "comment" },
  { label: "Genre", key: "genre" },
  { label: "Group", key: "group" },
  { label: "Description", key: "description" },
  { label: "Language", key: "language" },
  { label: "ISRC", key: "isrc" },
  { label: "Product ID", key: "productId" },
  { label: "Year", key: "year" },
  { label: "Recording Date", key: "recordingDate" },
  { label: "Original Release", key: "originalReleaseDate" },
  { label: "Publishing Date", key: "publishingDate" },
  { label: "BPM", key: "bpm" },
  { label: "Rating", key: "rating" },
];

const LABEL_WIDTH = 16;

/**
 * Pad a label to {@link LABEL_WIDTH} columns and join it with `: <value>`.
 *
 * @param label - Field label.
 * @param value - Value to render.
 * @returns A single line of pretty output.
 */
const line = (label: string, value: string): string => `${label.padEnd(LABEL_WIDTH)}: ${value}`;

/**
 * Format a duration in ms as `1234.5 s`, with one decimal place.
 *
 * @param ms - Duration in milliseconds.
 * @returns A human-readable duration string.
 */
const formatDuration = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

/**
 * Format a `X / Y` style line when at least one of the values is defined.
 *
 * @param x - Numerator (e.g. `trackNumber`).
 * @param y - Denominator (e.g. `trackTotal`).
 * @returns Rendered text, or `undefined` when both inputs are absent.
 */
const formatRatio = (x: number | undefined, y: number | undefined): string | undefined => {
  if (x === undefined && y === undefined) {
    return undefined;
  }

  const left = x === undefined ? "?" : String(x);
  const right = y === undefined ? "?" : String(y);
  return `${left} / ${right}`;
};

/**
 * Render the picture summary line.
 *
 * @param track - Source `Track`.
 * @returns A summary like `1 (image/jpeg, 12345 B, kind 3)` or `0`.
 */
const formatPictures = (track: Track): string => {
  if (track.pictures.length === 0) {
    return "0";
  }

  const summaries = track.pictures.map(
    (p) => `${p.mimeType}, ${p.data.byteLength} B, kind ${p.kind}`,
  );
  return `${track.pictures.length} (${summaries.join("; ")})`;
};

/**
 * Render the lyrics summary line.
 *
 * @param track - Source `Track`.
 * @returns A summary like `present (eng, 245 chars)` or `none`.
 */
const formatLyrics = (track: Track): string => {
  if (track.lyrics === undefined) {
    return "none";
  }

  const language = track.lyrics.language === undefined ? "no-lang" : track.lyrics.language;
  const chars = track.lyrics.unsynchronized?.length ?? 0;
  const synced = track.lyrics.synchronized?.length ?? 0;
  const syncedTail = synced === 0 ? "" : `, ${synced} synced`;
  return `present (${language}, ${chars} chars${syncedTail})`;
};

/**
 * Render a human-readable summary of a `Track`.
 *
 * Field order mirrors `docs/field-mapping.md`. Empty / `undefined` tag fields
 * are dropped (the line is skipped) so `--pretty` output stays compact.
 *
 * @returns A multi-line string ending with a newline. Suitable for direct
 *   `process.stdout.write`.
 */
export const formatPretty = ({ track, noWarnings }: Args): string => {
  const lines: string[] = [];
  const formatHead =
    track.durationMs === undefined
      ? track.audioFormat
      : `${track.audioFormat} (${formatDuration(track.durationMs)})`;
  lines.push(line("Format", formatHead));

  TAG_FIELDS.forEach(({ label, key }) => {
    const value = track.tag[key];
    if (value !== undefined) {
      lines.push(line(label, String(value)));
    }
  });

  const trackLine = formatRatio(track.tag.trackNumber, track.tag.trackTotal);
  if (trackLine !== undefined) {
    lines.push(line("Track", trackLine));
  }

  const discLine = formatRatio(track.tag.discNumber, track.tag.discTotal);
  if (discLine !== undefined) {
    lines.push(line("Disc", discLine));
  }

  lines.push(line("Pictures", formatPictures(track)));
  lines.push(line("Chapters", String(track.chapters.length)));
  lines.push(line("Lyrics", formatLyrics(track)));

  const additionalKeys = Object.keys(track.additionalFields);
  if (additionalKeys.length > 0) {
    lines.push(line("Additional", `${additionalKeys.length} field(s)`));
  }

  if (!noWarnings) {
    if (track.warnings.length === 0) {
      lines.push(line("Warnings", "none"));
    } else {
      lines.push(line("Warnings", String(track.warnings.length)));
      track.warnings.forEach((w) => {
        lines.push(`  - [${w.severity}] ${w.message}`);
      });
    }
  }

  return `${lines.join("\n")}\n`;
};
