import { loadTrack, type PictureInfo, type PictureKindValue } from "@akabeko/music-metadata-editor";
import { saveModifiedTrack } from "../saveModifiedTrack.js";
import { parseKind } from "./parseKind.js";

/** Arguments accepted by {@link clearPicture}. */
type Args = {
  /** Source audio file. */
  readonly file: string;
  /** Optional `--kind` (raw kebab-case). */
  readonly kind?: string;
  /**
   * Optional `--index` selector (0-based). Combines with `kind` so that the
   * index targets the n-th picture *of that kind*; without `kind` it targets
   * the n-th picture overall.
   */
  readonly index?: number;
};

/** Outcome of running `clearPicture`. */
export type ClearPictureResult = {
  /** Stdout payload (always empty). */
  readonly stdout: string;
  /** Stderr payload (status / info lines). */
  readonly stderr: string;
};

/** Inputs to {@link resolveScopedIndex}. */
type ScopedIndexArgs = {
  /** Existing pictures. */
  readonly pictures: readonly PictureInfo[];
  /** Numeric kind to filter on. */
  readonly target: PictureKindValue;
  /** 0-based position within the kind-filtered subset. */
  readonly index: number;
};

/**
 * Resolve the absolute index that should be dropped when `--kind` and
 * `--index` are combined.
 *
 * Walks `pictures` once collecting indices that match `target`, then returns
 * the n-th of those (or `undefined` when out of range).
 *
 * @returns Absolute index in `pictures`, or `undefined` when no match.
 */
const resolveScopedIndex = ({ pictures, target, index }: ScopedIndexArgs): number | undefined => {
  const matched: number[] = [];
  pictures.forEach((p, i) => {
    if (p.kind === target) {
      matched.push(i);
    }
  });
  return matched[index];
};

/** Inputs to {@link composeNextPictures}. */
type ComposeArgs = {
  /** Existing pictures. */
  readonly pictures: readonly PictureInfo[];
  /** Optional `--kind` filter (raw kebab-case). */
  readonly kind: string | undefined;
  /** Optional `--index` selector. */
  readonly index: number | undefined;
};

/**
 * Compose the next pictures list given the requested removal.
 *
 * Encodes the four-way decision tree:
 * - no flags → drop everything.
 * - `--index N` only → drop `pictures[N]`.
 * - `--kind X` only → drop every picture matching `X`.
 * - `--kind X --index N` → drop the n-th picture matching `X`.
 *
 * Unmatched selectors leave the list unchanged so the disk write below still
 * goes through (re-running the command yields a stable file).
 *
 * @returns The composed list.
 */
const composeNextPictures = ({ pictures, kind, index }: ComposeArgs): readonly PictureInfo[] => {
  if (kind === undefined && index === undefined) {
    return [];
  }

  if (kind === undefined) {
    return pictures.filter((_, i) => i !== index);
  }

  const target = parseKind(kind);
  if (index === undefined) {
    return pictures.filter((p) => p.kind !== target);
  }

  const dropAt = resolveScopedIndex({ pictures, target, index });
  return dropAt === undefined ? pictures : pictures.filter((_, i) => i !== dropAt);
};

/**
 * Run `mme picture clear <file>`.
 *
 * @returns Buffered stdout / stderr payload.
 */
export const clearPicture = async (args: Args): Promise<ClearPictureResult> => {
  const track = await loadTrack(args.file);
  const nextPictures = composeNextPictures({
    pictures: track.pictures,
    kind: args.kind,
    index: args.index,
  });
  await saveModifiedTrack(args.file, { ...track, pictures: nextPictures });
  return { stdout: "", stderr: `[mme] wrote: ${args.file}\n` };
};
