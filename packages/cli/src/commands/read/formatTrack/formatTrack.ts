import type { Track } from "@akabeko/music-metadata-editor";
import type { ReadCommandOptions, TrackSection } from "../types.js";
import { TRACK_SECTIONS } from "../types.js";
import { formatField } from "./formatField.js";
import { formatJson } from "./formatJson.js";
import { formatPretty } from "./formatPretty.js";
import type { FormatTrackResult, SectionMask } from "./types.js";

/** Arguments accepted by {@link formatTrack}. */
type Args = {
  /** Source `Track` produced by `loadTrack` / `readMetadata`. */
  readonly track: Track;
  /** Validated read-command options (see `parseReadOptions`). */
  readonly options: ReadCommandOptions;
};

/**
 * Top-level dispatcher: turn a `Track` into the renderer-ready payload.
 *
 * Only one of the three branches runs for any given call:
 *
 * - `outputMode === "json"` → JSON object with sections filtered by
 *   `--include` / `--exclude` and `warnings` removed when `--no-warnings`.
 * - `outputMode === "pretty"` → human-readable multi-line text.
 * - `outputMode === "field"` → either the scalar text or, for compound
 *   sections, the JSON form (so callers can stream it raw).
 *
 * `--field` mode ignores `--include` / `--exclude` because the user already
 * narrowed the output to a single value; the caller is responsible for
 * surfacing the warning. `--no-warnings` only meaningfully affects JSON /
 * pretty modes.
 *
 * Throws a plain `Error` (`field "<path>" not found`) when `--field` cannot
 * resolve. The bin / runCli layer routes that through `formatMmeError`,
 * which prefixes `[mme] ` and resolves to exit code `1` (`Failure`).
 *
 * @returns A discriminated {@link FormatTrackResult}.
 */
export const formatTrack = ({ track, options }: Args): FormatTrackResult => {
  if (options.outputMode === "field") {
    if (options.field === undefined) {
      throw new Error("formatTrack: outputMode === 'field' requires options.field");
    }

    const result = formatField({ track, path: options.field });
    if (result.kind === "missing") {
      throw new Error(`field "${result.path}" not found`);
    }

    return { kind: "field", value: result.text };
  }

  if (options.outputMode === "pretty") {
    return { kind: "pretty", text: formatPretty({ track, noWarnings: options.noWarnings }) };
  }

  return {
    kind: "json",
    payload: formatJson({ track, mask: resolveMask(options) }),
  };
};

/**
 * Resolve the include / exclude / no-warnings combo into a single section
 * mask.
 *
 * The mask starts from the full set; `--include` reduces to the listed
 * sections; `--exclude` drops the listed sections; `--no-warnings` always
 * drops `warnings` regardless of include/exclude (it composes with both).
 *
 * @param options - Validated read-command options.
 * @returns A frozen set of selected sections.
 */
const resolveMask = (options: ReadCommandOptions): SectionMask => {
  const start: ReadonlySet<TrackSection> =
    options.include === undefined
      ? new Set<TrackSection>(TRACK_SECTIONS)
      : new Set<TrackSection>(options.include);
  const excluded = options.exclude;
  const afterExclude =
    excluded === undefined
      ? start
      : new Set<TrackSection>([...start].filter((section) => !excluded.includes(section)));

  if (!options.noWarnings) {
    return afterExclude;
  }

  return new Set<TrackSection>([...afterExclude].filter((section) => section !== "warnings"));
};
