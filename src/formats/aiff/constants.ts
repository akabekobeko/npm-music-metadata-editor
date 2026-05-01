/** ASCII bytes for the AIFF container magic (`"FORM"`). */
export const AIFF_MAGIC_FORM = new Uint8Array([0x46, 0x4f, 0x52, 0x4d]);

/** ASCII bytes for the `AIFF` form-type marker. */
export const AIFF_FORM_TYPE_AIFF = new Uint8Array([0x41, 0x49, 0x46, 0x46]);

/** ASCII bytes for the `AIFC` form-type marker (compressed AIFF). */
export const AIFF_FORM_TYPE_AIFC = new Uint8Array([0x41, 0x49, 0x46, 0x43]);

/**
 * Size of the outer FORM header: 4-byte `"FORM"` magic + 4-byte size +
 * 4-byte form type (`"AIFF"` or `"AIFC"`).
 */
export const AIFF_HEADER_SIZE = 12;

/** Mandatory common chunk (`"COMM"`). Holds sample rate, channel count, etc. */
export const AIFF_CHUNK_COMM = "COMM";

/** Sound data chunk (`"SSND"`). Carries the audio samples. */
export const AIFF_CHUNK_SSND = "SSND";

/** Native title chunk (`"NAME"`). */
export const AIFF_CHUNK_NAME = "NAME";

/** Native author / artist chunk (`"AUTH"`). */
export const AIFF_CHUNK_AUTH = "AUTH";

/** Native copyright chunk (`"(c) "`, with trailing space). */
export const AIFF_CHUNK_COPYRIGHT = "(c) ";

/** Native annotation chunk (`"ANNO"`); deprecated in favour of `COMT`. */
export const AIFF_CHUNK_ANNO = "ANNO";

/** Embedded ID3v2 chunk (`"ID3 "`, with trailing space). */
export const AIFF_CHUNK_ID3 = "ID3 ";
