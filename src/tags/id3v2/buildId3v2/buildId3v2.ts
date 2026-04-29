import { Buffer } from "node:buffer";
import type { Id3v2Frame } from "../types.js";
import { buildFrame } from "./buildFrame.js";
import { buildHeader } from "./buildHeader.js";

type BuildId3v2Args = {
  /** Major version to emit (`3` or `4`). */
  majorVersion: 3 | 4;
  /** Frames to emit in order. */
  frames: readonly Id3v2Frame[];
  /**
   * Padding bytes to append after the last frame (zeros).
   * Useful so consumers can later add frames without rewriting the audio data.
   */
  padding?: number;
};

/**
 * Build a complete ID3v2 tag (`"ID3" + header + frames + padding`).
 *
 * Phase 2 only emits ID3v2.3 and ID3v2.4. Tag-level unsynchronisation is not
 * applied; per-frame flags are zeroed; padding defaults to `0` bytes (caller
 * may opt in by setting `padding`).
 *
 * @returns Header + frames + padding bytes ready to prepend to the audio payload.
 */
export const buildId3v2 = (args: BuildId3v2Args): Uint8Array => {
  const padding = args.padding ?? 0;
  if (!Number.isInteger(padding) || padding < 0) {
    throw new RangeError(`buildId3v2: padding must be a non-negative integer (got ${padding})`);
  }

  const frameBuffers = args.frames.map((frame) =>
    buildFrame({ frame, majorVersion: args.majorVersion }),
  );
  const framesBytes = frameBuffers.reduce((sum, buf) => sum + buf.length, 0);
  const bodySize = framesBytes + padding;
  const header = buildHeader({ majorVersion: args.majorVersion, bodySize });

  // `Buffer.alloc(padding)` gives us a zero-filled tail when caller asked for padding.
  const concatenated = Buffer.concat([header, ...frameBuffers, Buffer.alloc(padding)]);
  return new Uint8Array(concatenated.buffer, concatenated.byteOffset, concatenated.byteLength);
};
