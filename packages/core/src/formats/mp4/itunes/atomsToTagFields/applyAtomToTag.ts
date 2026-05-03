import { Buffer } from "node:buffer";
import type { PictureInfo, TagData } from "../../../../types.js";
import { PictureKind } from "../../../../types.js";
import type { ItunesAtom } from "../../types.js";
import { applyFreeformAtom } from "./applyFreeformAtom.js";
import { PICTURE_MIME_BY_TYPE } from "./constants.js";
import { parseYearPrefix } from "./parseYearPrefix.js";
import { readBeSignedInt } from "./readBeSignedInt.js";
import { readNumberAndTotal } from "./readNumberAndTotal.js";
import { readUtf8 } from "./readUtf8.js";
import { resolveGnreIndex } from "./resolveGnreIndex.js";

/** Arguments for {@link applyAtomToTag}. */
type Args = {
  /** Tag accumulator (mutated in place). */
  tag: TagData;
  /** Picture accumulator (mutated in place). */
  pictures: PictureInfo[];
  /** The atom to fold in. */
  atom: ItunesAtom;
};

/**
 * Apply one decoded {@link ItunesAtom} onto the accumulators.
 *
 * The function is exhaustive over the iTunes atoms we recognise; everything
 * else (custom `----` fields, unknown 4-character codes) is left untouched —
 * the caller keeps the original {@link ItunesAtom} list to round-trip them.
 */
export const applyAtomToTag = ({ tag, pictures, atom }: Args): void => {
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
