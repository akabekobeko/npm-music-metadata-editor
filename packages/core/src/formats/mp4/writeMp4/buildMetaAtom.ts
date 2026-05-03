import { Buffer } from "node:buffer";
import { ITUNES_HDLR_PAYLOAD, META_VERSION_FLAGS_SIZE } from "../constants.js";
import { buildAtom } from "./buildAtom.js";
import { concat } from "./concat.js";

/**
 * Rebuild the `meta` atom payload with a fresh `hdlr` followed by `ilst`.
 *
 * The `meta` body is `(version+flags) + hdlr + ilst`, matching the canonical
 * iTunes layout.
 *
 * @param ilstPayload - Serialized ilst children (without the box header).
 * @returns The complete `meta` atom bytes (header + payload).
 */
export const buildMetaAtom = (ilstPayload: Uint8Array): Uint8Array => {
  const versionFlags = Buffer.alloc(META_VERSION_FLAGS_SIZE);
  const hdlr = buildAtom("hdlr", ITUNES_HDLR_PAYLOAD);
  const ilst = buildAtom("ilst", ilstPayload);
  return buildAtom("meta", concat([new Uint8Array(versionFlags), hdlr, ilst]));
};
