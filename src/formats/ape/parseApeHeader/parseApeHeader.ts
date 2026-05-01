import { Buffer } from "node:buffer";
import {
  APE_COMMON_HEADER_SIZE,
  APE_FILE_MAGIC,
  APE_NEW_HEADER_MIN_VERSION,
} from "../constants.js";
import type { ApeAudioInfo } from "../types.js";
import { parseNewHeader } from "./parseNewHeader.js";
import { parseOldHeader } from "./parseOldHeader.js";

/**
 * Parse the Monkey's Audio header at the start of `input`.
 *
 * Dispatches on the version field embedded after the `"MAC "` magic to pick
 * the legacy (`<= 3.97`) or modern (`>= 3.98`) layout.
 *
 * @param input - Whole-file bytes.
 * @returns Decoded audio info, or `undefined` when the magic does not match
 *   or the buffer is too short for either layout.
 */
export const parseApeHeader = (input: Uint8Array): ApeAudioInfo | undefined => {
  if (input.length < APE_COMMON_HEADER_SIZE) {
    return undefined;
  }

  for (let i = 0; i < APE_FILE_MAGIC.length; i++) {
    if (input[i] !== APE_FILE_MAGIC[i]) {
      return undefined;
    }
  }

  const view = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  const version = view.readUInt16LE(APE_FILE_MAGIC.length);

  return version >= APE_NEW_HEADER_MIN_VERSION
    ? parseNewHeader(input, version)
    : parseOldHeader(input, version);
};
