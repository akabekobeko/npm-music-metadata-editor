import { ItunesDataType, type ItunesDataTypeValue } from "../../constants.js";

/**
 * Resolve the iTunes data type for an embedded picture's MIME type.
 *
 * @param mimeType - Picture MIME type (`"image/png"`, `"image/jpeg"`, ...).
 * @returns The matching iTunes data type indicator (defaults to JPEG).
 */
export const pictureTypeIndicator = (mimeType: string): ItunesDataTypeValue => {
  if (mimeType === "image/png") {
    return ItunesDataType.Png;
  }

  if (mimeType === "image/bmp") {
    return ItunesDataType.Bmp;
  }

  return ItunesDataType.Jpeg;
};
