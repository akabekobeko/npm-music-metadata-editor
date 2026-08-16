import { ItunesDataType } from "../../constants.js";

/**
 * iTunes type indicator → MIME type for the picture types we support
 * directly. Other indicators (e.g. BMP) fall back to `application/octet-stream`
 * because we have no first-class support for them.
 */
export const PICTURE_MIME_BY_TYPE: ReadonlyMap<number, string> = new Map([
  [ItunesDataType.Jpeg, "image/jpeg"],
  [ItunesDataType.Png, "image/png"],
  [ItunesDataType.Bmp, "image/bmp"],
]);
