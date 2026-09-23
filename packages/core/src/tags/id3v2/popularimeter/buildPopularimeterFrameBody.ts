import { Buffer } from "node:buffer";
import { encodeText } from "../../../utils/encoding/encodeText.js";
import type { Popularimeter } from "./types.js";

/**
 * Serialize a {@link Popularimeter} into a `POPM` frame body.
 *
 * NUL is the structural separator between e-mail and rating; zero bytes are
 * stripped from the encoded e-mail (after Latin-1 encoding, so code points
 * whose low byte is `0x00` cannot smuggle one in) to keep the rating byte in
 * place.
 *
 * @param popularimeter - Fields to encode.
 * @returns The frame body (`<email><00><rating><counter...>`).
 */
export const buildPopularimeterFrameBody = ({
  email,
  rating,
  counter,
}: Popularimeter): Uint8Array => {
  const emailBytes = encodeText(email, "latin1").filter((byte) => byte !== 0x00);
  const out = Buffer.alloc(emailBytes.length + 2 + counter.length);
  out.set(emailBytes, 0);
  out[emailBytes.length] = 0x00;
  out[emailBytes.length + 1] = Math.max(0, Math.min(255, Math.round(rating)));
  out.set(counter, emailBytes.length + 2);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
