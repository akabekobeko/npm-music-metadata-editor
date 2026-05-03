/**
 * Vorbis identification packet magic — `0x01` packet type byte followed by
 * the ASCII bytes `"vorbis"`. Source: Vorbis I specification §4.2.2.
 */
export const VORBIS_ID_MAGIC = new Uint8Array([0x01, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73]);

/**
 * Vorbis comment packet magic — `0x03` + `"vorbis"`.
 *
 * Comment packets must carry this prefix in addition to the standard Vorbis
 * Comment block bytes (vendor + entries + framing bit).
 */
export const VORBIS_COMMENT_MAGIC = new Uint8Array([0x03, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73]);

/**
 * Vorbis setup packet magic — `0x05` + `"vorbis"`.
 *
 * Used to locate the boundary between the comment and setup packets when the
 * writer needs to preserve the setup packet during a tag rewrite.
 */
export const VORBIS_SETUP_MAGIC = new Uint8Array([0x05, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73]);

/** Opus identification header magic (`"OpusHead"`). */
export const OPUS_HEAD_MAGIC = new Uint8Array([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64]);

/** Opus comment header magic (`"OpusTags"`). */
export const OPUS_TAGS_MAGIC = new Uint8Array([0x4f, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73]);

/**
 * Logical sample rate reported for Opus streams.
 *
 * The Opus codec runs at 48 kHz internally regardless of the original input
 * sample rate (which is informational only and stored in `OpusHead`).
 */
export const OPUS_SAMPLE_RATE = 48000;
