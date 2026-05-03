import { ItunesDataType } from "../../constants.js";
import type { ItunesDataValue } from "../../types.js";
import { encodeSignedBe } from "./encodeSignedBe.js";

/**
 * Encode a 1-, 2-, or 4-byte big-endian signed integer (iTunes type 21). The
 * smallest representation that fits the value is chosen, matching iTunes'
 * own behaviour.
 *
 * @param value - Signed integer to encode.
 * @returns A {@link ItunesDataValue} of type 21 (BE signed int).
 */
export const beSignedIntValue = (value: number): ItunesDataValue => ({
  typeIndicator: ItunesDataType.BeSignedInt,
  locale: 0,
  data: encodeSignedBe(value),
});
