import { ItunesDataType } from "../../../formats/mp4/constants.js";
import type { ItunesAtom } from "../../../formats/mp4/types.js";
import type { PictureInfo } from "../../../types.js";
import { PictureKind } from "../../../types.js";
import { detectMime } from "../detectMime.js";

/** Map an iTunes type indicator onto a MIME string. */
const MIME_BY_TYPE_INDICATOR: ReadonlyMap<number, string> = new Map([
  [ItunesDataType.Jpeg, "image/jpeg"],
  [ItunesDataType.Png, "image/png"],
  [ItunesDataType.Bmp, "image/bmp"],
]);

/**
 * Decode an MP4 `covr` atom into one or more {@link PictureInfo} entries.
 *
 * `covr` may carry several `data` sub-atoms (one per embedded image). Every
 * image is reported as {@link PictureKind.CoverFront} because MP4 does not
 * carry a per-image role; callers wanting more granular kinds should override
 * the resulting `kind` field after the fact.
 *
 * @param atom - The `covr` atom decoded from `ilst`.
 * @returns The decoded pictures in the order they appeared, or an empty array
 *   when the atom carried no recognised image data.
 */
export const covrToPicture = (atom: ItunesAtom): readonly PictureInfo[] =>
  atom.values.flatMap((value) => {
    const mimeFromIndicator = MIME_BY_TYPE_INDICATOR.get(value.typeIndicator);
    const mimeType = mimeFromIndicator ?? detectMime(value.data) ?? "application/octet-stream";
    return [
      {
        mimeType,
        kind: PictureKind.CoverFront,
        data: value.data,
      },
    ];
  });
