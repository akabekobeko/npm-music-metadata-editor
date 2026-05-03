import type { TagData } from "@akabeko/music-metadata-editor";
import { CommanderError } from "commander";
import { parseTrackSpec, type TrackSpec } from "./parseTrackSpec.js";
import {
  ALL_TAG_FIELDS,
  type AllTagField,
  FLOAT01_TAG_FIELDS,
  INTEGER_TAG_FIELDS,
  STRING_TAG_FIELDS,
  type TagOverrides,
  type WriteCliRawOptions,
} from "./types.js";

/** Arguments accepted by {@link parseTagOverrides}. */
type Args = {
  /** Raw commander options for the `write` subcommand. */
  readonly opts: WriteCliRawOptions;
  /** Pre-loaded `--tag-file` content; the caller resolves file / stdin I/O. */
  readonly tagFile?: Partial<TagData>;
};

const STRING_FIELD_SET: ReadonlySet<string> = new Set<string>(STRING_TAG_FIELDS);
const INTEGER_FIELD_SET: ReadonlySet<string> = new Set<string>(INTEGER_TAG_FIELDS);
const FLOAT01_FIELD_SET: ReadonlySet<string> = new Set<string>(FLOAT01_TAG_FIELDS);
const ALL_FIELD_SET: ReadonlySet<string> = new Set<string>(ALL_TAG_FIELDS);

/** Sentinel value of `--clear` that drops every `TagData` key. */
const CLEAR_ALL_KEYWORD = "all";

/**
 * Throw a commander usage error so the CLI maps it to exit code 2.
 *
 * @param message - User-facing error message.
 * @returns Never; always throws.
 */
const usageError = (message: string): never => {
  throw new CommanderError(2, "mme.usageError", message);
};

/**
 * Parse the `--json` payload into a `Partial<TagData>` view.
 *
 * Performs structural validation (object literal, known keys, well-typed
 * values) so downstream consumers can trust the shape. Number coercion is
 * intentionally absent: `--json '{"year": "2020"}'` is rejected rather than
 * silently coerced to keep semantics transparent.
 *
 * @param raw - Raw `--json` string.
 * @returns The validated `Partial<TagData>`.
 */
const parseJsonPayload = (raw: string): Partial<TagData> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return usageError(`--json: invalid JSON (${(error as Error).message})`);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return usageError("--json: expected a JSON object");
  }

  return validateTagPayload(parsed as Record<string, unknown>, "--json");
};

/**
 * Validate a Plain Object against the known `TagData` schema.
 *
 * @param payload - Raw object literal supplied by `--json` / `--tag-file`.
 * @param source - Label embedded in error messages.
 * @returns The validated `Partial<TagData>`.
 */
export const validateTagPayload = (
  payload: Record<string, unknown>,
  source: string,
): Partial<TagData> => {
  const out: Partial<TagData> = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (!ALL_FIELD_SET.has(key)) {
      usageError(`${source}: unknown tag field "${key}"`);
    }

    assignValidatedValue({ out, key: key as AllTagField, value, source });
  });

  return out;
};

/**
 * Arguments accepted by {@link assignValidatedValue}.
 */
type AssignValueArgs = {
  /** Accumulator object that receives the validated value. */
  readonly out: Partial<TagData>;
  /** Field name. Must be a recognised {@link AllTagField}. */
  readonly key: AllTagField;
  /** Raw value from JSON. */
  readonly value: unknown;
  /** Label embedded in error messages. */
  readonly source: string;
};

/**
 * Assign a single JSON value onto the accumulator after type validation.
 */
const assignValidatedValue = ({ out, key, value, source }: AssignValueArgs): void => {
  if (STRING_FIELD_SET.has(key)) {
    if (typeof value !== "string") {
      usageError(`${source}.${key}: expected string, got ${describe(value)}`);
    }

    (out as Record<string, unknown>)[key] = value;
    return;
  }

  if (INTEGER_FIELD_SET.has(key)) {
    if (!Number.isInteger(value)) {
      usageError(`${source}.${key}: expected integer, got ${describe(value)}`);
    }

    (out as Record<string, unknown>)[key] = value;
    return;
  }

  if (FLOAT01_FIELD_SET.has(key)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
      usageError(`${source}.${key}: expected number in [0, 1], got ${describe(value)}`);
    }

    (out as Record<string, unknown>)[key] = value;
    return;
  }

  // Composite-derived keys (trackNumber / trackTotal / discNumber / discTotal).
  if (!Number.isInteger(value) || (value as number) < 0) {
    usageError(`${source}.${key}: expected non-negative integer, got ${describe(value)}`);
  }

  (out as Record<string, unknown>)[key] = value;
};

/**
 * Render a value for inclusion in a usage error message.
 *
 * @param value - Any unknown.
 * @returns A short, single-quoted summary safe to embed.
 */
const describe = (value: unknown): string => {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
};

/**
 * Parse a `--year` / `--bpm`-style integer flag value.
 *
 * @param raw - Raw flag value.
 * @param flag - Flag name embedded in error messages.
 * @returns The parsed integer.
 */
const parseIntegerFlag = (raw: string, flag: string): number => {
  if (!/^-?\d+$/.test(raw)) {
    return usageError(`${flag}: expected an integer, got "${raw}"`);
  }

  return Number.parseInt(raw, 10);
};

/**
 * Parse the `--rating` flag value (float in `[0, 1]`).
 *
 * @param raw - Raw flag value.
 * @returns The parsed rating.
 */
const parseRating = (raw: string): number => {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    return usageError(`--rating: expected a number in [0, 1], got "${raw}"`);
  }

  return value;
};

/**
 * Arguments accepted by {@link applyTrackSpec}.
 */
type ApplyTrackSpecArgs = {
  /** Accumulator that receives `numberKey` / `totalKey`. */
  readonly assign: Partial<TagData>;
  /** Parsed track/disc spec. */
  readonly spec: TrackSpec;
  /** `TagData` key receiving `spec.number`. */
  readonly numberKey: "trackNumber" | "discNumber";
  /** `TagData` key receiving `spec.total` when present. */
  readonly totalKey: "trackTotal" | "discTotal";
};

/**
 * Apply `--track` / `--disc` to the `assign` accumulator.
 *
 * `<n>` sets only `<prefix>Number`; `<n>/<total>` sets both `<prefix>Number`
 * and `<prefix>Total` so the caller does not implicitly drop a previous total.
 */
const applyTrackSpec = ({ assign, spec, numberKey, totalKey }: ApplyTrackSpecArgs): void => {
  (assign as Record<string, unknown>)[numberKey] = spec.number;
  if (spec.total !== undefined) {
    (assign as Record<string, unknown>)[totalKey] = spec.total;
  }
};

/**
 * Fold individual `--<field>` flags into the `assign` accumulator.
 *
 * Each flag overwrites the corresponding key, matching the planned
 * "JSON first, individual flags last" precedence the caller already set up.
 *
 * @param assign - Accumulator to mutate.
 * @param opts - Raw commander options.
 */
const applyIndividualFlags = (assign: Partial<TagData>, opts: WriteCliRawOptions): void => {
  STRING_TAG_FIELDS.forEach((key) => {
    const value = opts[key];
    if (value !== undefined) {
      (assign as Record<string, unknown>)[key] = value;
    }
  });

  INTEGER_TAG_FIELDS.forEach((key) => {
    const value = opts[key];
    if (value !== undefined) {
      (assign as Record<string, unknown>)[key] = parseIntegerFlag(value, `--${kebab(key)}`);
    }
  });

  if (opts.rating !== undefined) {
    (assign as Record<string, unknown>).rating = parseRating(opts.rating);
  }

  if (opts.track !== undefined) {
    applyTrackSpec({
      assign,
      spec: parseTrackSpec(opts.track, "--track"),
      numberKey: "trackNumber",
      totalKey: "trackTotal",
    });
  }

  if (opts.disc !== undefined) {
    applyTrackSpec({
      assign,
      spec: parseTrackSpec(opts.disc, "--disc"),
      numberKey: "discNumber",
      totalKey: "discTotal",
    });
  }
};

/**
 * Convert a camelCase identifier back into kebab-case for error messages.
 *
 * Used when reporting a flag name derived from a `TagData` key (e.g.
 * `albumArtist` → `album-artist`).
 *
 * @param key - camelCase identifier.
 * @returns The kebab-case form.
 */
const kebab = (key: string): string => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Resolve the `--clear` accumulator into a clear list and a `clearAll` flag.
 *
 * Each entry may be a single field, a comma-separated list of fields, or the
 * literal `all` keyword. Unknown fields raise a usage error. Once `all` is
 * seen, the field-list portion collapses to an empty array since `applyOverrides`
 * already drops everything.
 *
 * @param raw - Repeated `--clear` values commander accumulated.
 * @returns The parsed clear list and `clearAll` toggle.
 */
const parseClearList = (
  raw: readonly string[],
): { readonly clear: readonly AllTagField[]; readonly clearAll: boolean } => {
  const tokens = raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (tokens.includes(CLEAR_ALL_KEYWORD)) {
    return { clear: [], clearAll: true };
  }

  const invalid = tokens.find((token) => !ALL_FIELD_SET.has(token));
  if (invalid !== undefined) {
    usageError(`--clear: unknown field "${invalid}"`);
  }

  // De-duplicate while preserving order so the consumer sees a stable list.
  const seen = new Set<string>();
  const clear = tokens.filter((token) => {
    if (seen.has(token)) {
      return false;
    }

    seen.add(token);
    return true;
  });
  return { clear: clear as AllTagField[], clearAll: false };
};

/**
 * Arguments accepted by {@link checkAssignClearConflict}.
 */
type CheckConflictArgs = {
  /** Accumulated assignments. */
  readonly assign: Partial<TagData>;
  /** Field names slated for removal. */
  readonly clear: readonly AllTagField[];
  /** Whether `--clear all` was requested. */
  readonly clearAll: boolean;
};

/**
 * Reject conflicts between assignments and clears.
 *
 * Both `--title "X"` together with `--clear title` and the JSON equivalent
 * are surfaced as exit code 2 — `applyOverrides` would silently drop one of
 * them otherwise.
 */
const checkAssignClearConflict = ({ assign, clear, clearAll }: CheckConflictArgs): void => {
  const assigned = Object.keys(assign);
  if (clearAll && assigned.length > 0) {
    // `--clear all` plus an assignment is fine: the user wants a wipe followed
    // by setting fresh values. Only individual `--clear <field>` collisions
    // are ambiguous, so leave this case alone.
    return;
  }

  const conflict = clear.find((field) => assigned.includes(field));
  if (conflict !== undefined) {
    usageError(`cannot --${kebab(conflict)} and --clear ${conflict} together`);
  }
};

/**
 * Translate the raw write-command flag bag into a {@link TagOverrides}.
 *
 * Precedence (lowest → highest):
 *
 * 1. `--tag-file` content (resolved by the caller).
 * 2. `--json` payload.
 * 3. Individual `--<field>` flags.
 *
 * `--clear` is parsed last and validated against the assignments so a single
 * field cannot be both set and cleared.
 *
 * @returns The parsed mutation; throws {@link CommanderError} on misuse.
 */
export const parseTagOverrides = ({ opts, tagFile }: Args): TagOverrides => {
  const assign: Partial<TagData> = {};
  if (tagFile !== undefined) {
    Object.assign(assign, tagFile);
  }

  if (opts.json !== undefined) {
    Object.assign(assign, parseJsonPayload(opts.json));
  }

  applyIndividualFlags(assign, opts);

  const { clear, clearAll } = parseClearList(opts.clear ?? []);
  checkAssignClearConflict({ assign, clear, clearAll });

  return { assign, clear, clearAll };
};
