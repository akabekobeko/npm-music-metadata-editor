import { Buffer } from "node:buffer";
import { ItunesDataType } from "../../constants.js";
import type { ItunesDataValue } from "../../types.js";

/** Arguments for {@link numberAndTotalValue}. */
type Args = {
  /** Track / disc number (`0` when unset). */
  number: number;
  /** Track / disc total (`0` when unset). */
  total: number;
  /** Whether to append the 2-byte trailing pad iTunes includes for `trkn` only. */
  trailingPad: boolean;
};

/**
 * Build the `trkn` / `disk` data payload (8 bytes for `trkn`, 6 bytes for
 * `disk` — both encode `0 + number + total + 0`).
 *
 * @returns A {@link ItunesDataValue} of type 0 (implicit).
 */
export const numberAndTotalValue = ({ number, total, trailingPad }: Args): ItunesDataValue => {
  const length = trailingPad ? 8 : 6;
  const buf = Buffer.alloc(length);
  buf.writeUInt16BE(0, 0);
  buf.writeUInt16BE(number, 2);
  buf.writeUInt16BE(total, 4);
  return {
    typeIndicator: ItunesDataType.Implicit,
    locale: 0,
    data: new Uint8Array(buf),
  };
};
