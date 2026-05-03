import { ItunesDataType, type ItunesDataTypeValue } from "../../../formats/mp4/constants.js";
import type { ItunesAtom } from "../../../formats/mp4/types.js";
import type { PictureInfo } from "../../../types.js";

/** Resolve an iTunes data type indicator from a MIME string. */
const indicatorFromMime = (mimeType: string): ItunesDataTypeValue => {
  if (mimeType === "image/png") {
    return ItunesDataType.Png;
  }

  if (mimeType === "image/bmp") {
    return ItunesDataType.Bmp;
  }

  return ItunesDataType.Jpeg;
};

/**
 * Encode a list of {@link PictureInfo} as a single MP4 `covr` atom.
 *
 * Every picture lands as one `data` sub-atom; the type indicator is chosen
 * from the MIME string (defaulting to JPEG when unknown). Pictures with no
 * bytes are dropped so the writer never emits empty `data` atoms.
 *
 * @param pictures - Pictures to embed under `covr`.
 * @returns The atom ready to merge into the ilst list, or `undefined` when
 *   `pictures` would produce no encodable values.
 */
export const pictureToCovr = (pictures: readonly PictureInfo[]): ItunesAtom | undefined => {
  const values = pictures
    .filter((picture) => picture.data.length > 0)
    .map((picture) => ({
      typeIndicator: indicatorFromMime(picture.mimeType),
      locale: 0,
      data: picture.data,
    }));
  if (values.length === 0) {
    return undefined;
  }

  return { name: "covr", values };
};
