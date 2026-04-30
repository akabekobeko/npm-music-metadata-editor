import { Buffer } from "node:buffer";
import type { PictureInfo, TagData } from "../../../types.js";
import { PictureKind } from "../../../types.js";
import { ItunesDataType } from "../constants.js";
import type { ItunesAtom, ItunesDataValue } from "../types.js";

/**
 * iTunes type indicator → MIME type for the picture types we support
 * directly. Other indicators (e.g. BMP) fall back to `application/octet-stream`
 * because we have no first-class support for them.
 */
const PICTURE_MIME_BY_TYPE = new Map<number, string>([
  [ItunesDataType.Jpeg, "image/jpeg"],
  [ItunesDataType.Png, "image/png"],
  [ItunesDataType.Bmp, "image/bmp"],
]);

/**
 * Decode a UTF-8 string carried by a single `data` value.
 *
 * @param value - The value to decode.
 * @returns The decoded string.
 */
const readUtf8 = (value: ItunesDataValue): string =>
  Buffer.from(value.data.buffer, value.data.byteOffset, value.data.byteLength).toString("utf8");

/**
 * Decode a 1/2/3/4-byte big-endian *signed* integer (iTunes type indicator
 * 21). The sibling type 22 (unsigned) is not currently consumed by any
 * field this module handles, so only the signed path is implemented.
 *
 * @returns The decoded number, or `undefined` when the byte length is invalid.
 */
const readBeSignedInt = (value: ItunesDataValue): number | undefined => {
  const bytes = value.data;
  if (bytes.length === 0 || bytes.length > 4) {
    return undefined;
  }

  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length === 1) {
    return view.readInt8(0);
  }

  if (bytes.length === 2) {
    return view.readInt16BE(0);
  }

  if (bytes.length === 3) {
    return view.readIntBE(0, 3);
  }

  return view.readInt32BE(0);
};

/**
 * Parse a `trkn` / `disk` payload into `(number, total)` pair. Both atoms
 * use a 4-byte reserved prefix + 2-byte index + 2-byte total layout (and
 * `trkn` carries 2 extra bytes beyond that, which we ignore).
 *
 * @param value - The value whose `data` bytes hold the pair.
 * @returns The decoded pair, or `undefined` when the data is too short.
 */
const readNumberAndTotal = (
  value: ItunesDataValue,
): { number?: number; total?: number } | undefined => {
  const bytes = value.data;
  if (bytes.length < 6) {
    return undefined;
  }

  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const number = view.readUInt16BE(2);
  const total = view.readUInt16BE(4);
  return {
    ...(number > 0 ? { number } : {}),
    ...(total > 0 ? { total } : {}),
  };
};

/** Arguments for {@link applyAtomToTag}. */
type ApplyArgs = {
  /** Tag accumulator (mutated in place). */
  tag: TagData;
  /** Picture accumulator (mutated in place). */
  pictures: PictureInfo[];
  /** The atom to fold in. */
  atom: ItunesAtom;
};

/**
 * Map one `gnre` value (1-based ID3v1 genre index) to the corresponding name.
 * Only the first 80 entries are part of the historic ID3v1 list and the
 * fallback to a stringified number matches widely-deployed iTunes behaviour.
 */
const ID3V1_GENRES: readonly string[] = [
  "Blues",
  "Classic Rock",
  "Country",
  "Dance",
  "Disco",
  "Funk",
  "Grunge",
  "Hip-Hop",
  "Jazz",
  "Metal",
  "New Age",
  "Oldies",
  "Other",
  "Pop",
  "R&B",
  "Rap",
  "Reggae",
  "Rock",
  "Techno",
  "Industrial",
  "Alternative",
  "Ska",
  "Death Metal",
  "Pranks",
  "Soundtrack",
  "Euro-Techno",
  "Ambient",
  "Trip-Hop",
  "Vocal",
  "Jazz+Funk",
  "Fusion",
  "Trance",
  "Classical",
  "Instrumental",
  "Acid",
  "House",
  "Game",
  "Sound Clip",
  "Gospel",
  "Noise",
  "AlternRock",
  "Bass",
  "Soul",
  "Punk",
  "Space",
  "Meditative",
  "Instrumental Pop",
  "Instrumental Rock",
  "Ethnic",
  "Gothic",
];

/**
 * Resolve a `gnre` index (1-based) to the matching ID3v1 genre name.
 *
 * @returns The genre string, or `undefined` when the index is out of range.
 */
const resolveGnreIndex = (index: number): string | undefined => {
  const zeroBased = index - 1;
  if (zeroBased < 0 || zeroBased >= ID3V1_GENRES.length) {
    return undefined;
  }

  return ID3V1_GENRES[zeroBased];
};

/**
 * Try to interpret one `©day` value (often `"YYYY"` or `"YYYY-MM-DD..."`) as
 * a 4-digit year for `tag.year`.
 *
 * @returns Parsed year, or `undefined` when the prefix isn't 4 digits.
 */
const parseYearPrefix = (value: string): number | undefined => {
  const match = value.match(/^(\d{4})/);
  if (match === null) {
    return undefined;
  }

  const yearText = match[1];
  if (yearText === undefined) {
    return undefined;
  }

  const year = Number.parseInt(yearText, 10);
  return Number.isNaN(year) ? undefined : year;
};

/**
 * Apply one decoded {@link ItunesAtom} onto the accumulators.
 *
 * The function is exhaustive over the iTunes atoms we recognise; everything
 * else (custom `----` fields, unknown 4-character codes) is left untouched —
 * the caller keeps the original {@link ItunesAtom} list to round-trip them.
 */
const applyAtomToTag = ({ tag, pictures, atom }: ApplyArgs): void => {
  const first = atom.values[0];
  if (first === undefined) {
    return;
  }

  switch (atom.name) {
    case "©nam":
      tag.title = readUtf8(first);
      return;
    case "©ART":
    case "©art":
      tag.artist = readUtf8(first);
      return;
    case "aART":
      tag.albumArtist = readUtf8(first);
      return;
    case "©alb":
      tag.album = readUtf8(first);
      return;
    case "©wrt":
      tag.composer = readUtf8(first);
      return;
    case "©con":
      tag.conductor = readUtf8(first);
      return;
    case "©cmt":
      tag.comment = readUtf8(first);
      return;
    case "©gen":
      tag.genre = readUtf8(first);
      return;
    case "©grp":
      tag.group = readUtf8(first);
      return;
    case "©lyr":
      // Lyrics are surfaced via Phase 9; for now the value is dropped.
      return;
    case "©too":
    case "©enc":
      return;
    case "©day": {
      const text = readUtf8(first);
      tag.recordingDate = text;
      const year = parseYearPrefix(text);
      if (year !== undefined) {
        tag.year = year;
      }

      return;
    }
    case "cprt":
      tag.copyright = readUtf8(first);
      return;
    case "©pub":
    case "publ":
      tag.publisher = readUtf8(first);
      return;
    case "desc":
    case "©des":
    case "ldes":
      tag.description = readUtf8(first);
      return;
    case "rldt":
      tag.publishingDate = readUtf8(first);
      return;
    case "prID":
      tag.productId = readUtf8(first);
      return;
    case "©isr":
      tag.isrc = readUtf8(first);
      return;
    case "tmpo": {
      const bpm = readBeSignedInt(first);
      if (bpm !== undefined) {
        tag.bpm = bpm;
      }

      return;
    }
    case "rtng": {
      const rating = readBeSignedInt(first);
      if (rating !== undefined) {
        // iTunes encodes a 0-100 rating; normalise into [0, 1].
        tag.rating = Math.max(0, Math.min(1, rating / 100));
      }

      return;
    }
    case "trkn": {
      const pair = readNumberAndTotal(first);
      if (pair === undefined) {
        return;
      }

      if (pair.number !== undefined) {
        tag.trackNumber = pair.number;
      }

      if (pair.total !== undefined) {
        tag.trackTotal = pair.total;
      }

      return;
    }
    case "disk": {
      const pair = readNumberAndTotal(first);
      if (pair === undefined) {
        return;
      }

      if (pair.number !== undefined) {
        tag.discNumber = pair.number;
      }

      if (pair.total !== undefined) {
        tag.discTotal = pair.total;
      }

      return;
    }
    case "gnre": {
      const view = Buffer.from(first.data.buffer, first.data.byteOffset, first.data.byteLength);
      if (first.data.length >= 2) {
        const index = view.readUInt16BE(0);
        const name = resolveGnreIndex(index);
        if (name !== undefined) {
          tag.genre = name;
        }
      }

      return;
    }
    case "covr": {
      // `covr` may carry multiple data atoms (one per embedded image).
      for (const value of atom.values) {
        const mimeType = PICTURE_MIME_BY_TYPE.get(value.typeIndicator);
        if (mimeType === undefined) {
          continue;
        }

        pictures.push({
          mimeType,
          kind: PictureKind.CoverFront,
          data: value.data,
        });
      }

      return;
    }
    default: {
      if (atom.name === "----") {
        applyFreeformAtom({ tag, atom });
      }
    }
  }
};

/** Arguments for {@link applyFreeformAtom}. */
type FreeformArgs = {
  /** Tag accumulator. */
  tag: TagData;
  /** The freeform atom (`----`). */
  atom: ItunesAtom;
};

/**
 * Map a few well-known `----` freeform field names onto our tag shape.
 *
 * Only the names commonly emitted by iTunes / MusicBrainz are handled. The
 * caller still keeps the raw atom in the parsed list so unhandled freeform
 * entries round-trip unchanged.
 */
const applyFreeformAtom = ({ tag, atom }: FreeformArgs): void => {
  const first = atom.values[0];
  if (first === undefined) {
    return;
  }

  const text = readUtf8(first);
  switch (atom.meanName) {
    case "LYRICIST":
      tag.lyricist = text;
      return;
    case "CONDUCTOR":
      tag.conductor = text;
      return;
    case "LANGUAGE":
      tag.language = text;
      return;
    case "CATALOGNUMBER":
      tag.productId = text;
      return;
    default:
      return;
  }
};

/**
 * Project the parsed ilst entries onto the public tag shape.
 *
 * @param atoms - All decoded ilst atoms.
 * @returns The projected `tag` plus any decoded `pictures`.
 */
export const atomsToTagFields = (
  atoms: readonly ItunesAtom[],
): { tag: TagData; pictures: readonly PictureInfo[] } => {
  const tag: TagData = {};
  const pictures: PictureInfo[] = [];
  for (const atom of atoms) {
    applyAtomToTag({ tag, pictures, atom });
  }

  return { tag, pictures };
};
