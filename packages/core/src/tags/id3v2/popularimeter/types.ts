/**
 * Decoded body of a `POPM` (popularimeter) frame.
 *
 * Layout: `<email><00><rating:1><counter...>`. The counter is a big-endian
 * play count of four or more bytes that may be omitted entirely; it is kept
 * as raw bytes so the writer can re-emit it verbatim.
 */
export type Popularimeter = {
  /** E-mail identifying the rating's owner (Latin-1). */
  email: string;
  /** Raw rating byte (`0` .. `255`). */
  rating: number;
  /** Raw play-counter bytes (empty when the frame omitted the counter). */
  counter: Uint8Array;
};
