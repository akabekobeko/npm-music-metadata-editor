import { Buffer } from "node:buffer";
import type { PictureInfo, TagData } from "../../../types.js";
import { ItunesDataType, type ItunesDataTypeValue } from "../constants.js";
import type { ItunesAtom, ItunesDataValue } from "../types.js";

/**
 * Encode a UTF-8 text value as one `data` payload.
 *
 * @param text - Text to encode.
 * @returns A {@link ItunesDataValue} carrying the UTF-8 bytes.
 */
const utf8Value = (text: string): ItunesDataValue => ({
  typeIndicator: ItunesDataType.Utf8,
  locale: 0,
  data: new Uint8Array(Buffer.from(text, "utf8")),
});

/**
 * Encode a 1-, 2-, or 4-byte big-endian signed integer (iTunes type 21). The
 * smallest representation that fits the value is chosen, matching iTunes'
 * own behaviour.
 *
 * @param value - Signed integer to encode.
 * @returns A {@link ItunesDataValue} of type 21 (BE signed int).
 */
const beSignedIntValue = (value: number): ItunesDataValue => {
  const buf = encodeSignedBe(value);
  return {
    typeIndicator: ItunesDataType.BeSignedInt,
    locale: 0,
    data: buf,
  };
};

/**
 * Encode a signed integer using the smallest BE representation that fits.
 *
 * @param value - Signed integer to encode.
 * @returns The encoded bytes (1, 2, or 4 bytes).
 */
const encodeSignedBe = (value: number): Uint8Array => {
  if (value >= -0x80 && value <= 0x7f) {
    const out = Buffer.alloc(1);
    out.writeInt8(value, 0);
    return new Uint8Array(out);
  }

  if (value >= -0x8000 && value <= 0x7fff) {
    const out = Buffer.alloc(2);
    out.writeInt16BE(value, 0);
    return new Uint8Array(out);
  }

  const out = Buffer.alloc(4);
  out.writeInt32BE(value, 0);
  return new Uint8Array(out);
};

/** Arguments for {@link numberAndTotalValue}. */
type NumberAndTotalArgs = {
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
const numberAndTotalValue = ({
  number,
  total,
  trailingPad,
}: NumberAndTotalArgs): ItunesDataValue => {
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

/**
 * Resolve the iTunes data type for an embedded picture's MIME type.
 *
 * @param mimeType - Picture MIME type (`"image/png"`, `"image/jpeg"`, ...).
 * @returns The matching iTunes data type indicator (defaults to JPEG).
 */
const pictureTypeIndicator = (mimeType: string): ItunesDataTypeValue => {
  if (mimeType === "image/png") {
    return ItunesDataType.Png;
  }

  if (mimeType === "image/bmp") {
    return ItunesDataType.Bmp;
  }

  return ItunesDataType.Jpeg;
};

/** Arguments for {@link tagToItunesAtoms}. */
type Args = {
  /** Tag fields to encode. Fields left `undefined` are skipped. */
  tag: Partial<TagData>;
  /** Pictures to embed under `covr` (replaces any existing pictures). */
  pictures?: readonly PictureInfo[];
};

/**
 * Build a single-value {@link ItunesAtom} for a given (name, value) pair.
 *
 * @param name - 4-character atom code.
 * @param value - The data value to attach.
 * @returns The constructed atom.
 */
const singleValueAtom = (name: string, value: ItunesDataValue): ItunesAtom => ({
  name,
  values: [value],
});

/**
 * Build the canonical iTunes atom list for the given tag.
 *
 * Only the fields we know how to project make it onto the result; everything
 * else stays in the caller's "pass-through" list so the writer can re-emit
 * unknown atoms verbatim. Atoms are emitted in a stable order matching the
 * iTunes convention.
 *
 * @returns The encoded atoms in writing order.
 */
export const tagToItunesAtoms = ({ tag, pictures }: Args): readonly ItunesAtom[] => {
  const out: ItunesAtom[] = [];

  if (tag.title !== undefined) out.push(singleValueAtom("©nam", utf8Value(tag.title)));
  if (tag.artist !== undefined) out.push(singleValueAtom("©ART", utf8Value(tag.artist)));
  if (tag.albumArtist !== undefined) out.push(singleValueAtom("aART", utf8Value(tag.albumArtist)));
  if (tag.album !== undefined) out.push(singleValueAtom("©alb", utf8Value(tag.album)));
  if (tag.composer !== undefined) out.push(singleValueAtom("©wrt", utf8Value(tag.composer)));
  if (tag.conductor !== undefined) out.push(singleValueAtom("©con", utf8Value(tag.conductor)));
  if (tag.comment !== undefined) out.push(singleValueAtom("©cmt", utf8Value(tag.comment)));
  if (tag.genre !== undefined) out.push(singleValueAtom("©gen", utf8Value(tag.genre)));
  if (tag.group !== undefined) out.push(singleValueAtom("©grp", utf8Value(tag.group)));
  if (tag.copyright !== undefined) out.push(singleValueAtom("cprt", utf8Value(tag.copyright)));
  if (tag.publisher !== undefined) out.push(singleValueAtom("©pub", utf8Value(tag.publisher)));
  if (tag.description !== undefined) {
    out.push(singleValueAtom("desc", utf8Value(tag.description)));
  }

  if (tag.publishingDate !== undefined) {
    out.push(singleValueAtom("rldt", utf8Value(tag.publishingDate)));
  }

  if (tag.productId !== undefined) out.push(singleValueAtom("prID", utf8Value(tag.productId)));
  if (tag.isrc !== undefined) out.push(singleValueAtom("©isr", utf8Value(tag.isrc)));

  // `©day` carries either the year alone or the full ISO date — prefer
  // `recordingDate` when both are set to keep the more precise value.
  if (tag.recordingDate !== undefined) {
    out.push(singleValueAtom("©day", utf8Value(tag.recordingDate)));
  } else if (tag.year !== undefined) {
    out.push(singleValueAtom("©day", utf8Value(String(tag.year))));
  }

  if (tag.bpm !== undefined) out.push(singleValueAtom("tmpo", beSignedIntValue(tag.bpm)));
  if (tag.rating !== undefined) {
    out.push(singleValueAtom("rtng", beSignedIntValue(Math.round(tag.rating * 100))));
  }

  if (tag.trackNumber !== undefined || tag.trackTotal !== undefined) {
    out.push(
      singleValueAtom(
        "trkn",
        numberAndTotalValue({
          number: tag.trackNumber ?? 0,
          total: tag.trackTotal ?? 0,
          trailingPad: true,
        }),
      ),
    );
  }

  if (tag.discNumber !== undefined || tag.discTotal !== undefined) {
    out.push(
      singleValueAtom(
        "disk",
        numberAndTotalValue({
          number: tag.discNumber ?? 0,
          total: tag.discTotal ?? 0,
          trailingPad: false,
        }),
      ),
    );
  }

  if (tag.lyricist !== undefined) {
    out.push({
      name: "----",
      meanName: "LYRICIST",
      values: [utf8Value(tag.lyricist)],
    });
  }

  if (tag.language !== undefined) {
    out.push({
      name: "----",
      meanName: "LANGUAGE",
      values: [utf8Value(tag.language)],
    });
  }

  if (pictures !== undefined && pictures.length > 0) {
    out.push({
      name: "covr",
      values: pictures.map((p) => ({
        typeIndicator: pictureTypeIndicator(p.mimeType),
        locale: 0,
        data: p.data,
      })),
    });
  }

  return out;
};
