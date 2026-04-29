import type { Mp3AudioInfo, MpegChannelMode, MpegLayer, MpegVersion } from "./types.js";

/**
 * MPEG bitrate table indexed as `[versionIndex][layerIndex][bitrateIndex]`.
 *
 * `versionIndex` follows the encoded value (0=2.5, 1=reserved, 2=2, 3=1);
 * `layerIndex` follows the encoded value (0=reserved, 1=Layer III, 2=Layer II, 3=Layer I).
 * Source: ATL.NET `MPEGaudio.MPEG_BIT_RATE`.
 */
const BIT_RATES: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> = [
  // 0: MPEG 2.5
  [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
    [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
  ],
  // 1: reserved
  [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // 2: MPEG 2
  [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
    [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
  ],
  // 3: MPEG 1
  [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
    [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
    [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0],
  ],
];

/** Sample-rate table indexed as `[versionIndex][rateIndex]`. */
const SAMPLE_RATES: ReadonlyArray<ReadonlyArray<number>> = [
  [11025, 12000, 8000, 0], // MPEG 2.5
  [0, 0, 0, 0], // reserved
  [22050, 24000, 16000, 0], // MPEG 2
  [44100, 48000, 32000, 0], // MPEG 1
];

const VERSION_BY_INDEX: Readonly<Record<number, MpegVersion>> = {
  0: "2.5",
  2: "2",
  3: "1",
};

const LAYER_BY_INDEX: Readonly<Record<number, MpegLayer>> = {
  1: "III",
  2: "II",
  3: "I",
};

const CHANNEL_BY_INDEX: Readonly<Record<number, MpegChannelMode>> = {
  0: "stereo",
  1: "joint-stereo",
  2: "dual-channel",
  3: "mono",
};

/**
 * Parse the 4-byte MPEG audio header at `bytes[offset .. offset + 4]`.
 *
 * Returns `undefined` when the bytes do not look like a valid MPEG audio sync
 * word, or when the encoded version / layer / bitrate / samplerate are
 * reserved values.
 *
 * @param bytes - Bytes containing the audio frame header at `offset`.
 * @param offset - Offset where the 4-byte header begins.
 * @returns The decoded {@link Mp3AudioInfo}, or `undefined` for unrecognised headers.
 */
export const parseMp3AudioHeader = (
  bytes: Uint8Array,
  offset: number,
): Mp3AudioInfo | undefined => {
  if (offset + 4 > bytes.length) {
    return undefined;
  }

  const b0 = bytes[offset] as number;
  const b1 = bytes[offset + 1] as number;
  const b2 = bytes[offset + 2] as number;
  const b3 = bytes[offset + 3] as number;
  // MPEG sync: byte 0 = 0xFF, byte 1 high three bits = 111.
  if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) {
    return undefined;
  }

  const versionIndex = (b1 >>> 3) & 0x03;
  const layerIndex = (b1 >>> 1) & 0x03;
  const bitrateIndex = (b2 >>> 4) & 0x0f;
  const sampleRateIndex = (b2 >>> 2) & 0x03;
  const channelIndex = (b3 >>> 6) & 0x03;

  const version = VERSION_BY_INDEX[versionIndex];
  const layer = LAYER_BY_INDEX[layerIndex];
  if (version === undefined || layer === undefined || bitrateIndex === 0x0f) {
    return undefined;
  }

  const bitrate = BIT_RATES[versionIndex]?.[layerIndex]?.[bitrateIndex] ?? 0;
  const sampleRate = SAMPLE_RATES[versionIndex]?.[sampleRateIndex] ?? 0;
  if (sampleRate === 0) {
    return undefined;
  }

  const channelMode = CHANNEL_BY_INDEX[channelIndex] ?? "stereo";
  const channels = channelMode === "mono" ? 1 : 2;

  return { version, layer, bitrate, sampleRate, channelMode, channels };
};
