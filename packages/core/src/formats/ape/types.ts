/**
 * Decoded Monkey's Audio header info.
 *
 * Fields that vary between the legacy (`<= 3.97`) and modern (`>= 3.98`)
 * layouts are normalised here so callers do not have to branch on version.
 */
export type ApeAudioInfo = {
  /** Raw version number — `MAC SDK version * 1000` (e.g. `3990` for 3.99). */
  version: number;
  /** Sample rate in Hz. */
  sampleRate: number;
  /** Channel count (`1` for mono, `2` for stereo). */
  channels: number;
  /** Bits per sample (`8`, `16`, or `24`). */
  bitsPerSample: number;
  /**
   * Total uncompressed sample count.
   *
   * Computed from `(totalFrames - 1) * blocksPerFrame + finalFrameBlocks` for
   * both the old and new header layouts. `0` when the header reports no
   * frames (defensive fallback for truncated files).
   */
  totalSamples: number;
  /** Stream duration in milliseconds (derived from `totalSamples / sampleRate`). */
  durationMs: number;
  /** Compression level code (`1000`..`6000`; multiples of `1000`). */
  compressionLevel: number;
};
