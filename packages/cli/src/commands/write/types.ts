import type { AudioFormat, TagData } from "@akabeko/music-metadata-editor";

/**
 * `TagData` keys whose CLI counterpart accepts a free-form string value.
 *
 * The list intentionally enumerates fields rather than deriving them from
 * `TagData` so future additions to core stay opt-in: a new core field does
 * not silently expand the CLI surface until the table is updated.
 */
export const STRING_TAG_FIELDS = [
  "title",
  "artist",
  "album",
  "albumArtist",
  "composer",
  "conductor",
  "lyricist",
  "publisher",
  "copyright",
  "comment",
  "genre",
  "group",
  "description",
  "language",
  "isrc",
  "productId",
  "recordingDate",
  "originalReleaseDate",
  "publishingDate",
] as const;

/** A single allowed string-valued field. */
export type StringTagField = (typeof STRING_TAG_FIELDS)[number];

/** Integer-valued tag fields exposed by the CLI. */
export const INTEGER_TAG_FIELDS = ["year", "bpm"] as const;

/** A single allowed integer-valued field. */
export type IntegerTagField = (typeof INTEGER_TAG_FIELDS)[number];

/** Float-valued tag fields constrained to `[0, 1]`. */
export const FLOAT01_TAG_FIELDS = ["rating"] as const;

/** A single allowed float-valued field. */
export type Float01TagField = (typeof FLOAT01_TAG_FIELDS)[number];

/**
 * All `TagData` keys writable from the CLI as a flat union.
 *
 * Composite specs (`--track 3/12`, `--disc 1/2`) are not listed here because
 * each spec resolves to a pair of `TagData` keys (`trackNumber` / `trackTotal`,
 * etc.); see {@link COMPOSITE_TAG_FIELDS} for those.
 */
export type WritableTagField = StringTagField | IntegerTagField | Float01TagField;

/**
 * `TagData` keys produced by composite CLI flags (`--track`, `--disc`).
 *
 * Listed separately because no single flag toggles them in isolation, but
 * `applyOverrides` and `--clear` still need to know they are valid.
 */
export const COMPOSITE_TAG_FIELDS = [
  "trackNumber",
  "trackTotal",
  "discNumber",
  "discTotal",
] as const;

/** Every `TagData` key the CLI knows how to assign or clear. */
export const ALL_TAG_FIELDS = [
  ...STRING_TAG_FIELDS,
  ...INTEGER_TAG_FIELDS,
  ...FLOAT01_TAG_FIELDS,
  ...COMPOSITE_TAG_FIELDS,
] as const;

/** A single allowed tag field name. */
export type AllTagField = (typeof ALL_TAG_FIELDS)[number];

/**
 * Raw `--option` flags emitted by commander for the `write` subcommand.
 *
 * Tag-value flags are kept as raw strings here and validated downstream by
 * `parseTagOverrides`. Mode flags (`--stdin`, `--output`, `--dry-run`,
 * `--atomic`) are interpreted by `parseWriteOptions`.
 */
export type WriteCliRawOptions = Partial<Record<StringTagField, string>> &
  Partial<Record<IntegerTagField | Float01TagField, string>> & {
    /** `--track <n[/total]>`. */
    readonly track?: string;
    /** `--disc <n[/total]>`. */
    readonly disc?: string;
    /** `--json '<json>'` raw payload (a `Partial<TagData>` JSON document). */
    readonly json?: string;
    /** `--tag-file <path>` path; `-` denotes stdin. */
    readonly tagFile?: string;
    /** `--clear <field[,field...]>` repeatable; commander accumulates into an array. */
    readonly clear?: readonly string[];
    /** `--stdin` toggle. */
    readonly stdin?: boolean;
    /** `--format <fmt>` audio format hint (required with `--stdin`). */
    readonly format?: string;
    /** `--output <path|->` output destination. */
    readonly output?: string;
    /** `--dry-run` toggle. */
    readonly dryRun?: boolean;
    /**
     * `--atomic` / `--no-atomic` toggle. Defaults to `true`; commander
     * inverts it when the user passes `--no-atomic`.
     */
    readonly atomic?: boolean;
  };

/** Where the bytes the writer mutates come from. */
export type WriteSource =
  | { readonly kind: "file"; readonly path: string }
  | { readonly kind: "stdin"; readonly format: AudioFormat };

/** Where the rebuilt bytes go. */
export type WriteOutput =
  | { readonly kind: "in-place" }
  | { readonly kind: "path"; readonly path: string }
  | { readonly kind: "stdout" };

/**
 * Validated CLI options for `mme write`.
 *
 * Mode-level concerns only — the tag mutation lives in {@link TagOverrides},
 * which `handleWrite` derives from the same raw bag via `parseTagOverrides`.
 */
export type WriteCommandOptions = {
  /** Source: file path, or stdin with a forced audio format. */
  readonly source: WriteSource;
  /** Output destination. */
  readonly output: WriteOutput;
  /** When `true`, skip the disk write (file mode) / stdout write (stream mode). */
  readonly dryRun: boolean;
  /** Whether file-mode writes should use the rename-based atomic strategy. */
  readonly atomic: boolean;
};

/**
 * Result of folding the CLI flags + JSON payloads into a single tag mutation.
 *
 * `assign` is the new values to set; `clear` is the list of keys to drop;
 * `clearAll` short-circuits clear to "drop every `TagData` key". The three
 * fields are kept independent so `applyOverrides` can compose them in a
 * single pass.
 */
export type TagOverrides = {
  /** Fields to set on the resulting tag. */
  readonly assign: Partial<TagData>;
  /** Fields to drop from the resulting tag. */
  readonly clear: readonly AllTagField[];
  /** When `true`, every `TagData` field is dropped before `assign` is applied. */
  readonly clearAll: boolean;
};
