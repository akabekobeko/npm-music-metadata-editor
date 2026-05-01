/** ASCII bytes for the RIFF container magic (`"RIFF"`). */
export const WAV_MAGIC_RIFF = new Uint8Array([0x52, 0x49, 0x46, 0x46]);

/** ASCII bytes for the WAVE form-type marker (`"WAVE"`). */
export const WAV_FORM_TYPE = new Uint8Array([0x57, 0x41, 0x56, 0x45]);

/**
 * Size of the outer RIFF header: 4-byte `"RIFF"` magic + 4-byte size +
 * 4-byte `"WAVE"` form type.
 */
export const WAV_HEADER_SIZE = 12;

/** Chunk ID of the embedded `LIST` chunk used to host `INFO` metadata. */
export const WAV_CHUNK_LIST = "LIST";

/** Chunk ID of the audio sample chunk. */
export const WAV_CHUNK_DATA = "data";

/** Chunk ID of the embedded ID3v2 chunk (`"id3 "`, with trailing space). */
export const WAV_CHUNK_ID3 = "id3 ";

/** Chunk ID of the format-description chunk (`"fmt "`, with trailing space). */
export const WAV_CHUNK_FMT = "fmt ";

/** `LIST` chunk purpose marker for the `INFO` flavour. */
export const WAV_LIST_PURPOSE_INFO = "INFO";
