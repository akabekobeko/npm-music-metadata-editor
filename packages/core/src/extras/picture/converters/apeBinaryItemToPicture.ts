import { Buffer } from "node:buffer";
import { ApeItemKind } from "../../../tags/ape/constants.js";
import type { ApeItem } from "../../../tags/ape/types.js";
import type { PictureInfo, PictureKindValue } from "../../../types.js";
import { PictureKind } from "../../../types.js";
import { detectMime } from "../detectMime.js";

/**
 * Map APE binary item keys (e.g. `"Cover Art (Front)"`) onto our
 * {@link PictureKind} values, mirroring the conventions used by ATL.NET and
 * the reference APE Tag specification.
 */
const KIND_BY_KEY: ReadonlyMap<string, PictureKindValue> = new Map([
  ["COVER ART (OTHER)", PictureKind.Other],
  ["COVER ART (ICON)", PictureKind.Icon],
  ["COVER ART (OTHER ICON)", PictureKind.OtherIcon],
  ["COVER ART (FRONT)", PictureKind.CoverFront],
  ["COVER ART (BACK)", PictureKind.CoverBack],
  ["COVER ART (LEAFLET)", PictureKind.Leaflet],
  ["COVER ART (MEDIA)", PictureKind.Media],
  ["COVER ART (LEAD)", PictureKind.LeadArtist],
  ["COVER ART (ARTIST)", PictureKind.Artist],
  ["COVER ART (CONDUCTOR)", PictureKind.Conductor],
  ["COVER ART (BAND)", PictureKind.Band],
  ["COVER ART (COMPOSER)", PictureKind.Composer],
  ["COVER ART (LYRICIST)", PictureKind.Lyricist],
  ["COVER ART (STUDIO)", PictureKind.RecordingLocation],
  ["COVER ART (RECORDING)", PictureKind.DuringRecording],
  ["COVER ART (PERFORMANCE)", PictureKind.DuringPerformance],
  ["COVER ART (MOVIE SCENE)", PictureKind.ScreenCapture],
  ["COVER ART (COLOURED FISH)", PictureKind.BrightColoredFish],
  ["COVER ART (ILLUSTRATION)", PictureKind.Illustration],
  ["COVER ART (BAND LOGO)", PictureKind.BandLogo],
  ["COVER ART (PUBLISHER LOGO)", PictureKind.PublisherLogo],
]);

/**
 * Decode an APE Tag binary item (`Cover Art (Front)`, ...) into a {@link PictureInfo}.
 *
 * The APE binary value is laid out as `<filename:Latin1+\0><image-bytes>` where
 * the filename hint encodes the desired MIME via its extension. We honour the
 * extension when present, otherwise fall back to byte-level signature detection.
 *
 * @param item - The APE item to decode. Must be of kind {@link ApeItemKind.Binary}.
 * @returns The decoded picture, or `undefined` when the item is not binary or
 *   carries no recognisable payload.
 */
export const apeBinaryItemToPicture = (item: ApeItem): PictureInfo | undefined => {
  if (item.kind !== ApeItemKind.Binary || !(item.value instanceof Uint8Array)) {
    return undefined;
  }

  const bytes = item.value;
  const terminator = bytes.indexOf(0x00);
  const dataStart = terminator === -1 ? 0 : terminator + 1;
  const data = bytes.subarray(dataStart);
  if (data.length === 0) {
    return undefined;
  }

  const filename =
    terminator === -1 ? "" : Buffer.from(bytes.subarray(0, terminator)).toString("latin1");
  const mimeType = mimeFromFilename(filename) ?? detectMime(data) ?? "application/octet-stream";
  const kind = KIND_BY_KEY.get(item.key.toUpperCase()) ?? PictureKind.Other;
  return {
    mimeType,
    kind,
    description: filename === "" ? undefined : filename,
    // Slice copies into a fresh buffer so the picture survives independent of
    // the source APE buffer.
    data: data.slice(),
  };
};

/** Resolve a MIME type from the filename extension carried in the APE prefix. */
const mimeFromFilename = (filename: string): string | undefined => {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) {
    return undefined;
  }

  const extension = filename.slice(dotIndex + 1).toLowerCase();
  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "gif") {
    return "image/gif";
  }

  if (extension === "bmp") {
    return "image/bmp";
  }

  if (extension === "tif" || extension === "tiff") {
    return "image/tiff";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  return undefined;
};
