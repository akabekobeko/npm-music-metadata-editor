import { Buffer } from "node:buffer";
import { OPUS_SAMPLE_RATE } from "../streams/constants.js";
import { isOpusIdPacket } from "../streams/opus.js";
import type { OggCodecInfo, OggPage } from "../types.js";

/** Arguments for {@link computeDurationMs}. */
type Args = {
  /** Pages from the audio bitstream, in source order. */
  pages: readonly OggPage[];
  /** Codec info from the BOS packet (sample rate / codec). */
  codecInfo: OggCodecInfo;
  /** Identification packet bytes (BOS packet payload). */
  idPacket: Uint8Array;
};

/**
 * Compute the audio duration of an Ogg stream from its final granule
 * position.
 *
 * Vorbis encodes the granule position as raw PCM sample count, so the
 * duration is simply `granule / sampleRate × 1000`. Opus runs the granule
 * counter at 48 kHz and offsets it by `pre_skip` samples, so we subtract the
 * pre-skip before converting.
 *
 * @returns Duration in milliseconds, or `undefined` when the bitstream
 *   contains no usable granule position (e.g. all `-1` placeholders) or the
 *   sample rate is zero.
 */
export const computeDurationMs = ({ pages, codecInfo, idPacket }: Args): number | undefined => {
  if (codecInfo.sampleRate <= 0) {
    return undefined;
  }

  const granule = lastGranulePosition(pages);
  if (granule === undefined) {
    return undefined;
  }

  const preSkip = codecInfo.codec === "opus" ? readOpusPreSkip(idPacket) : 0;
  const samples = granule - BigInt(preSkip);
  if (samples <= 0n) {
    return undefined;
  }

  // sampleRate fits in `number`; granule is bounded by file size so
  // `Number(samples)` is exact for any realistic input.
  return Math.round((Number(samples) * 1000) / codecInfo.sampleRate);
};

/**
 * Walk the page list backwards looking for a usable granule position.
 *
 * Ogg pages whose payload only contains a partial packet carry a granule
 * position of `-1` (`0xFFFF...`) per RFC 3533 §6. This function skips those
 * placeholders so the final value reflects the real end-of-stream sample
 * count.
 *
 * @param pages - Pages of the audio bitstream, in source order.
 * @returns The most recent valid granule position, or `undefined` when no
 *   page carries one.
 */
const lastGranulePosition = (pages: readonly OggPage[]): bigint | undefined => {
  for (let i = pages.length - 1; i >= 0; i--) {
    const page = pages[i];
    if (page === undefined) {
      continue;
    }

    if (page.granulePosition !== 0xffff_ffff_ffff_ffffn) {
      return page.granulePosition;
    }
  }

  return undefined;
};

/**
 * Decode the `pre_skip` field from an `OpusHead` identification packet.
 *
 * Layout (RFC 7845 §5.1): magic (8) + version (1) + channel_count (1) +
 * pre_skip (2, little-endian) + ...
 *
 * @param packet - The Opus identification packet bytes.
 * @returns The pre-skip count in 48 kHz samples; `0` when the packet is
 *   too short or not actually an `OpusHead`.
 */
const readOpusPreSkip = (packet: Uint8Array): number => {
  if (!isOpusIdPacket(packet) || packet.length < 12) {
    return 0;
  }

  const view = Buffer.from(packet.buffer, packet.byteOffset, packet.byteLength);
  return view.readUInt16LE(10);
};

export { OPUS_SAMPLE_RATE };
