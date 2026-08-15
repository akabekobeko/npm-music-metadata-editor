/**
 * Frame IDs that carry an involved-people list: `IPLS` for ID3v2.3 and `TIPL`
 * for ID3v2.4 (v2.2 `IPL` frames are upgraded to `TIPL` at parse time).
 */
export const INVOLVED_PEOPLE_FRAME_IDS: ReadonlySet<string> = new Set(["TIPL", "IPLS"]);

/**
 * Role label for the producer entry inside an involved-people list.
 *
 * The ID3v2 spec leaves roles free-form; lower-case `"producer"` matches the
 * convention used by MusicBrainz Picard and other mainstream taggers. Role
 * comparison is case-insensitive on read.
 */
export const INVOLVED_PEOPLE_ROLE_PRODUCER = "producer";
