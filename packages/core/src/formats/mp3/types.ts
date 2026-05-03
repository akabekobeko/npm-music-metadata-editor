/** MPEG version codes. */
export type MpegVersion = "1" | "2" | "2.5";

/** MPEG audio layer (`I`, `II`, or `III`). */
export type MpegLayer = "I" | "II" | "III";

/** Channel mode reported by the MPEG header. */
export type MpegChannelMode = "stereo" | "joint-stereo" | "dual-channel" | "mono";

/** Decoded MPEG audio frame header (32 bits at the start of every frame). */
export type Mp3AudioInfo = {
  /** MPEG version. */
  version: MpegVersion;
  /** Layer (`I` / `II` / `III`). */
  layer: MpegLayer;
  /** Bit-rate in kbps (e.g. `128`). `0` when free-format. */
  bitrate: number;
  /** Sample rate in Hz (e.g. `44100`). */
  sampleRate: number;
  /** Channel mode. */
  channelMode: MpegChannelMode;
  /** Number of channels (`1` for mono, `2` otherwise). */
  channels: 1 | 2;
};
