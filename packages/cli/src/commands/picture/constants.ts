import { PictureKind, type PictureKindValue } from "@akabeko/music-metadata-editor";

/**
 * MIME types the CLI infers from filename extensions.
 *
 * Symmetric with {@link EXTENSION_BY_MIME}: the two tables are inverses of
 * each other for the four formats the CLI recognises (JPEG, PNG, GIF, WebP).
 * Anything else requires an explicit `--mime`.
 */
export const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * Extensions appended by `--auto-extension` in `mme picture extract`.
 *
 * Only the subset of MIME types {@link MIME_BY_EXTENSION} can produce is
 * surfaced here; other MIMEs leave the path unchanged.
 */
export const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

/**
 * Convert a PascalCase identifier (`CoverFront`) into kebab-case
 * (`cover-front`).
 *
 * Picture-kind enum keys are PascalCase; the trailing `replace` strips the
 * leading hyphen the per-uppercase substitution would otherwise produce.
 *
 * @param name - PascalCase identifier.
 * @returns The kebab-case form.
 */
const toKebab = (name: string): string =>
  name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/^-/, "");

/**
 * Mapping from CLI kebab-case picture-kind names to numeric `PictureKind`
 * values.
 *
 * Keys mirror the `PictureKind` constant identifiers via a PascalCase →
 * kebab-case projection so that, e.g., `CoverFront` is exposed on the CLI as
 * `cover-front`.
 */
export const PICTURE_KIND_BY_NAME: Readonly<Record<string, PictureKindValue>> = Object.fromEntries(
  Object.entries(PictureKind).map(([name, value]) => [toKebab(name), value as PictureKindValue]),
);

/** Sorted list of recognised CLI kind names — used in error messages. */
export const PICTURE_KIND_NAMES: readonly string[] = Object.keys(PICTURE_KIND_BY_NAME).sort();
