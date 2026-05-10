import type { PictureInfo } from "@mme/ipc";

/**
 * Picture-kind values surfaced in the Pictures dialog `<Select>`.
 *
 * Numeric values mirror core's `PictureKind` enum (the same numbers ID3v2
 * uses for `APIC` picture type). The user-facing label is resolved through
 * the `pictures.kind.<value>` translation key — keeping the list here lets a
 * future enum entry land with a single edit on each side.
 */
export const PICTURE_KIND_VALUES: ReadonlyArray<PictureInfo["kind"]> = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
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
