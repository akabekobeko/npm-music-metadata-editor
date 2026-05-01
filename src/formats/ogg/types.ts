/** Codec carried by an Ogg logical bitstream that this library understands. */
export type OggCodec = "vorbis" | "opus";

/**
 * One Ogg page parsed from an input buffer.
 *
 * Field names mirror RFC 3533 §6. `pageStart` and `pageSize` are derived
 * metadata that callers use to splice / re-emit the page without re-parsing.
 */
export type OggPage = {
  /** Stream-structure version (always `0` on RFC-compliant streams). */
  version: number;
  /** Bit flags drawn from `OggHeaderType` (`continuation | bos | eos`). */
  headerType: number;
  /** Granule position — codec-defined sample / frame counter. */
  granulePosition: bigint;
  /** Logical bitstream serial number. */
  serialNumber: number;
  /** Page sequence number within its logical bitstream. */
  pageSequence: number;
  /** CRC32 stored in the page header (with CRC field zeroed during compute). */
  crcChecksum: number;
  /** Lacing values (segment sizes); length matches `segmentCount`. */
  segmentSizes: readonly number[];
  /** Raw payload bytes that follow the segment table (zero-copy view). */
  payload: Uint8Array;
  /** Absolute offset of the page within the source buffer. */
  pageStart: number;
  /** Total page size (header + segment table + payload). */
  pageSize: number;
};

/**
 * Codec-level identification info extracted from the first packet of a
 * supported logical bitstream.
 */
export type OggCodecInfo = {
  /** Codec selected from the BOS packet magic. */
  codec: OggCodec;
  /** Sample rate in Hz (Vorbis carries it; Opus is fixed at 48000 Hz internally). */
  sampleRate: number;
  /** Output channel count. */
  channels: number;
};
