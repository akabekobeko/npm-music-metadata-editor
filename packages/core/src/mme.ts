import { registerAiffFormat } from "./formats/aiff/aiff.js";
import { registerApeFormat } from "./formats/ape/ape.js";
import { registerFlacFormat } from "./formats/flac/flac.js";
import { registerMp3Format } from "./formats/mp3/mp3.js";
import { registerMp4Format } from "./formats/mp4/mp4.js";
import { registerOggFormat } from "./formats/ogg/ogg.js";
import { registerWavFormat } from "./formats/wav/wav.js";
import { registerWmaFormat } from "./formats/wma/wma.js";

// Register all built-in formats on module load. The registry-driven design
// keeps `readMetadata` / `writeMetadata` / `loadTrack` / `saveTrack` agnostic
// of the individual format modules.
//
// Order matters: the first registration whose signature matches wins, so
// formats with strong multi-byte magic (fLaC / ftyp / OggS / ...) come first
// and MP3 — whose frame-sync signature is only ~2 bytes of effective magic —
// is registered last.
registerFlacFormat();
registerMp4Format();
registerOggFormat();
registerApeFormat();
registerWavFormat();
registerAiffFormat();
registerWmaFormat();
registerMp3Format();

export { loadTrack } from "./api/loadTrack.js";
export { readMetadata } from "./api/readMetadata.js";
export { saveTrack } from "./api/saveTrack.js";
export { writeMetadata } from "./api/writeMetadata.js";
export type { MmeError, MmeErrorCode } from "./errors/mmeError.js";
export { createMmeError, isMmeError } from "./errors/mmeError.js";
export { ID3V1_GENRES } from "./tags/id3v1/constants.js";
export type {
  AudioFormat,
  ChapterInfo,
  LyricsInfo,
  MetadataReadResult,
  PictureInfo,
  PictureKindValue,
  ReadOptions,
  SaveTrackOptions,
  SynchronizedLyric,
  TagData,
  TagSource,
  Track,
  Warning,
  WarningSeverity,
  WriteOptions,
} from "./types.js";
export { PictureKind } from "./types.js";
