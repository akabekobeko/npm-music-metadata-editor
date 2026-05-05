import type { PictureInfo } from "../../../main/ipc/types.js";

/**
 * Picture-kind options surfaced in the Pictures dialog `<Select>`.
 *
 * Numeric values mirror core's `PictureKind` enum (the same numbers ID3v2
 * uses for `APIC` picture type). Keeping the labels here decouples the
 * Renderer-side UI from the source-of-truth enum: when a new kind ships in
 * core we add an entry here without breaking the dialog.
 */
export const PICTURE_KIND_OPTIONS: readonly {
  readonly value: PictureInfo["kind"];
  readonly label: string;
}[] = [
  { value: 0, label: "Other" },
  { value: 1, label: "32x32 file icon" },
  { value: 2, label: "Other file icon" },
  { value: 3, label: "Cover (front)" },
  { value: 4, label: "Cover (back)" },
  { value: 5, label: "Leaflet page" },
  { value: 6, label: "Media" },
  { value: 7, label: "Lead artist" },
  { value: 8, label: "Artist" },
  { value: 9, label: "Conductor" },
  { value: 10, label: "Band" },
  { value: 11, label: "Composer" },
  { value: 12, label: "Lyricist" },
  { value: 13, label: "Recording location" },
  { value: 14, label: "During recording" },
  { value: 15, label: "During performance" },
  { value: 16, label: "Movie / video screen capture" },
  { value: 17, label: "A bright coloured fish" },
  { value: 18, label: "Illustration" },
  { value: 19, label: "Band / artist logotype" },
  { value: 20, label: "Publisher / studio logotype" },
];

/** MIME-type quick-select shortcuts shown above the free-text input. */
export const PICTURE_MIME_OPTIONS: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/** File-extension filter advertised by the open / save dialogs. */
export const PICTURE_FILE_EXTENSIONS: readonly string[] = ["jpg", "jpeg", "png", "webp", "gif"];

/** Threshold (5 MiB) above which the dialog warns about embedded picture size. */
export const PICTURE_SIZE_WARNING_BYTES = 5 * 1024 * 1024;
