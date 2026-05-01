import { registerFormat } from "../registry.js";
import { detectOggOpusSignature, detectOggVorbisSignature } from "./detectOgg.js";
import { readOgg } from "./readOgg/readOgg.js";
import { writeOgg } from "./writeOgg/writeOgg.js";

/**
 * Register the Ogg Vorbis and Ogg Opus formats with the global registry.
 *
 * Both formats share the same `"OggS"` capture pattern, so each registration
 * uses a codec-aware `detectSignature` that inspects the BOS packet payload
 * to disambiguate. The reader / writer is shared because both codecs reuse
 * the Vorbis Comment block; the writer handles codec-specific framing
 * internally.
 *
 * Idempotent: calling it twice replaces the existing entries with identical
 * records.
 */
export const registerOggFormat = (): void => {
  registerFormat({
    format: "ogg",
    extensions: [".ogg", ".oga"],
    detectSignature: detectOggVorbisSignature,
    read: readOgg,
    write: writeOgg,
  });
  registerFormat({
    format: "opus",
    extensions: [".opus"],
    detectSignature: detectOggOpusSignature,
    read: readOgg,
    write: writeOgg,
  });
};
