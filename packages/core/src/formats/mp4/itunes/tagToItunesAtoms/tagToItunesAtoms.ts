import type { PictureInfo, TagData, TagPatch } from "../../../../types.js";
import { hasTagValue } from "../../../../utils/tagPatch/hasTagValue.js";
import { isClearedValue } from "../../../../utils/tagPatch/isClearedValue.js";
import type { ItunesAtom } from "../../types.js";
import { beSignedIntValue } from "./beSignedIntValue.js";
import { numberPairAtom } from "./numberPairAtom.js";
import { pictureTypeIndicator } from "./pictureTypeIndicator.js";
import { singleValueAtom } from "./singleValueAtom.js";
import { tombstoneAtom } from "./tombstoneAtom.js";
import { utf8Value } from "./utf8Value.js";

/** `TagData` fields whose value is a string. */
type StringField = {
  [K in keyof TagData]-?: TagData[K] extends string | undefined ? K : never;
}[keyof TagData];

/**
 * Text fields projected onto a plain single-value atom, in iTunes emission
 * order.
 */
const TEXT_ATOMS: ReadonlyArray<[StringField, string]> = [
  ["title", "©nam"],
  ["artist", "©ART"],
  ["albumArtist", "aART"],
  ["album", "©alb"],
  ["composer", "©wrt"],
  ["conductor", "©con"],
  ["comment", "©cmt"],
  ["genre", "©gen"],
  ["group", "©grp"],
  ["copyright", "cprt"],
  ["publisher", "©pub"],
  ["description", "desc"],
  ["publishingDate", "rldt"],
  ["productId", "prID"],
  ["isrc", "©isr"],
];

/** Text fields projected onto a `----` freeform atom, keyed by `meanName`. */
const FREEFORM_ATOMS: ReadonlyArray<[StringField, string]> = [
  ["lyricist", "LYRICIST"],
  ["producer", "PRODUCER"],
  ["language", "LANGUAGE"],
];

/** Arguments for {@link tagToItunesAtoms}. */
type Args = {
  /**
   * Tag fields to encode. Fields left `undefined` are skipped; fields set to
   * `null` / `""` become tombstones (see {@link tombstoneAtom}).
   */
  tag: TagPatch;
  /**
   * Pictures to embed under `covr` (replaces any existing pictures). An empty
   * array yields a `covr` tombstone so the existing cover art is dropped.
   */
  pictures?: readonly PictureInfo[];
};

/**
 * Build the canonical iTunes atom list for the given tag.
 *
 * Only the fields we know how to project make it onto the result; everything
 * else stays in the caller's "pass-through" list so the writer can re-emit
 * unknown atoms verbatim. Atoms are emitted in a stable order matching the
 * iTunes convention. Cleared fields are represented by tombstones (atoms with
 * no values) which `mergeIlstAtoms` turns into deletions.
 *
 * @returns The encoded atoms in writing order.
 */
export const tagToItunesAtoms = ({ tag, pictures }: Args): readonly ItunesAtom[] => {
  const out: ItunesAtom[] = [];

  for (const [field, name] of TEXT_ATOMS) {
    const value = tag[field];
    if (value === undefined) {
      continue;
    }

    out.push(
      hasTagValue(value) ? singleValueAtom(name, utf8Value(value)) : tombstoneAtom({ name }),
    );
  }

  const day = dayAtom(tag);
  if (day !== undefined) {
    out.push(day);
  }

  if (tag.bpm !== undefined) {
    out.push(
      hasTagValue(tag.bpm)
        ? singleValueAtom("tmpo", beSignedIntValue(tag.bpm))
        : tombstoneAtom({ name: "tmpo" }),
    );
  }

  if (tag.rating !== undefined) {
    out.push(
      hasTagValue(tag.rating)
        ? singleValueAtom("rtng", beSignedIntValue(Math.round(tag.rating * 100)))
        : tombstoneAtom({ name: "rtng" }),
    );
  }

  const trkn = numberPairAtom({
    name: "trkn",
    number: tag.trackNumber,
    total: tag.trackTotal,
    trailingPad: true,
  });
  if (trkn !== undefined) {
    out.push(trkn);
  }

  const disk = numberPairAtom({
    name: "disk",
    number: tag.discNumber,
    total: tag.discTotal,
    trailingPad: false,
  });
  if (disk !== undefined) {
    out.push(disk);
  }

  for (const [field, meanName] of FREEFORM_ATOMS) {
    const value = tag[field];
    if (value === undefined) {
      continue;
    }

    out.push(
      hasTagValue(value)
        ? { name: "----", meanName, values: [utf8Value(value)] }
        : tombstoneAtom({ name: "----", meanName }),
    );
  }

  if (pictures !== undefined) {
    out.push(
      pictures.length === 0
        ? tombstoneAtom({ name: "covr" })
        : {
            name: "covr",
            values: pictures.map((p) => ({
              typeIndicator: pictureTypeIndicator(p.mimeType),
              locale: 0,
              data: p.data,
            })),
          },
    );
  }

  return out;
};

/**
 * Resolve the `©day` atom, which carries either the full ISO date or the
 * year alone.
 *
 * `recordingDate` wins when it has a value; otherwise `year` is used. When
 * neither has a value but at least one was explicitly cleared, a tombstone
 * removes the existing atom.
 *
 * @param tag - Source tag patch.
 * @returns The atom to merge, or `undefined` when neither field was touched.
 */
const dayAtom = (tag: TagPatch): ItunesAtom | undefined => {
  if (hasTagValue(tag.recordingDate)) {
    return singleValueAtom("©day", utf8Value(tag.recordingDate));
  }

  if (hasTagValue(tag.year)) {
    return singleValueAtom("©day", utf8Value(String(tag.year)));
  }

  if (isClearedValue(tag.recordingDate) || isClearedValue(tag.year)) {
    return tombstoneAtom({ name: "©day" });
  }

  return undefined;
};
