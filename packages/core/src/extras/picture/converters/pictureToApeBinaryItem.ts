import { Buffer } from "node:buffer";
import { ApeItemKind } from "../../../tags/ape/constants.js";
import type { ApeItem } from "../../../tags/ape/types.js";
import type { PictureInfo, PictureKindValue } from "../../../types.js";
import { PictureKind } from "../../../types.js";

/**
 * Reverse of the lookup used by {@link apeBinaryItemToPicture} — pick an APE
 * Tag binary item key for a given {@link PictureKind}.
 */
const KEY_BY_KIND: ReadonlyMap<PictureKindValue, string> = new Map([
  [PictureKind.Other, "Cover Art (Other)"],
  [PictureKind.Icon, "Cover Art (Icon)"],
  [PictureKind.OtherIcon, "Cover Art (Other Icon)"],
  [PictureKind.CoverFront, "Cover Art (Front)"],
  [PictureKind.CoverBack, "Cover Art (Back)"],
  [PictureKind.Leaflet, "Cover Art (Leaflet)"],
  [PictureKind.Media, "Cover Art (Media)"],
  [PictureKind.LeadArtist, "Cover Art (Lead)"],
  [PictureKind.Artist, "Cover Art (Artist)"],
  [PictureKind.Conductor, "Cover Art (Conductor)"],
  [PictureKind.Band, "Cover Art (Band)"],
  [PictureKind.Composer, "Cover Art (Composer)"],
  [PictureKind.Lyricist, "Cover Art (Lyricist)"],
  [PictureKind.RecordingLocation, "Cover Art (Studio)"],
  [PictureKind.DuringRecording, "Cover Art (Recording)"],
  [PictureKind.DuringPerformance, "Cover Art (Performance)"],
  [PictureKind.ScreenCapture, "Cover Art (Movie Scene)"],
  [PictureKind.BrightColoredFish, "Cover Art (Coloured Fish)"],
  [PictureKind.Illustration, "Cover Art (Illustration)"],
  [PictureKind.BandLogo, "Cover Art (Band Logo)"],
  [PictureKind.PublisherLogo, "Cover Art (Publisher Logo)"],
]);

/** Pick a default file extension for a given MIME type. */
const extensionFromMime = (mimeType: string): string => {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/gif") {
    return "gif";
  }

  if (mimeType === "image/bmp") {
    return "bmp";
  }

  if (mimeType === "image/tiff") {
    return "tif";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
};

/**
 * Encode a {@link PictureInfo} as an APE Tag binary item.
 *
 * The resulting `value` is laid out as `<filename:Latin1+\0><image-bytes>` per
 * the APE Tag binary item convention. The filename is taken from the picture
 * description (or `"cover.<ext>"` when no description is set) and is encoded
 * Latin-1; the extension comes from the MIME type.
 *
 * @param picture - Source picture.
 * @returns The encoded APE item.
 */
export const pictureToApeBinaryItem = (picture: PictureInfo): ApeItem => {
  const key = KEY_BY_KIND.get(picture.kind) ?? "Cover Art (Other)";
  const extension = extensionFromMime(picture.mimeType);
  const description = picture.description ?? "";
  const filename =
    description === "" ? `cover.${extension}` : ensureExtension(description, extension);
  const filenameBytes = Buffer.from(filename, "latin1");
  const value = Buffer.concat([filenameBytes, Uint8Array.of(0x00), picture.data]);
  return {
    key,
    value: new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
    kind: ApeItemKind.Binary,
    readOnly: false,
  };
};

/** Ensure the candidate filename ends with the desired extension. */
const ensureExtension = (filename: string, extension: string): string => {
  const lower = filename.toLowerCase();
  const expected = `.${extension}`;
  if (lower.endsWith(expected)) {
    return filename;
  }

  return `${filename}${expected}`;
};
