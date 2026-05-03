import type { PictureInfo, TagData } from "../../../../types.js";
import type { ItunesAtom } from "../../types.js";
import { beSignedIntValue } from "./beSignedIntValue.js";
import { numberAndTotalValue } from "./numberAndTotalValue.js";
import { pictureTypeIndicator } from "./pictureTypeIndicator.js";
import { singleValueAtom } from "./singleValueAtom.js";
import { utf8Value } from "./utf8Value.js";

/** Arguments for {@link tagToItunesAtoms}. */
type Args = {
  /** Tag fields to encode. Fields left `undefined` are skipped. */
  tag: Partial<TagData>;
  /** Pictures to embed under `covr` (replaces any existing pictures). */
  pictures?: readonly PictureInfo[];
};

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
