import type { TagData } from "../../../types.js";
import type { WavInfoEntry } from "../types.js";
import { assignRecordingDate } from "./assignRecordingDate.js";
import { parseTrackNumber } from "./parseTrackNumber.js";

/**
 * Convert decoded `LIST/INFO` entries onto the high-level {@link TagData}
 * shape.
 *
 * Only the well-known INFO codes are surfaced; unknown entries are dropped
 * (they are still preserved on write because the writer reads them from the
 * existing chunk payload, not from the projected `TagData`).
 *
 * @param entries - INFO entries in file order.
 * @returns A `TagData` populated with the recognised fields.
 */
export const infoEntriesToTagData = (entries: readonly WavInfoEntry[]): TagData => {
  const result: TagData = {};
  for (const entry of entries) {
    const value = entry.value;
    if (value === "") {
      continue;
    }

    switch (entry.key) {
      case "INAM":
      case "TITL":
        result.title = value;
        break;
      case "IART":
        result.artist = value;
        break;
      case "IPRD":
        result.album = value;
        break;
      case "ICMT":
        result.comment = value;
        break;
      case "ICOP":
        result.copyright = value;
        break;
      case "ICRD":
        assignRecordingDate(result, value);
        break;
      case "IGNR":
        result.genre = value;
        break;
      case "ILNG":
        result.language = value;
        break;
      case "IMUS":
        result.composer = value;
        break;
      case "TRCK":
      case "IPRT":
      case "ITRK": {
        const track = parseTrackNumber(value);
        if (track !== undefined) {
          result.trackNumber = track;
        }

        break;
      }
    }
  }

  return result;
};
