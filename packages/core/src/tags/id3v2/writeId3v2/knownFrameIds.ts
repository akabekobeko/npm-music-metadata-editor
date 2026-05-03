/**
 * Frame IDs that the MP3 writer synthesizes from `TagData`.
 *
 * Existing frames carrying any other ID are preserved verbatim across a
 * round-trip so APIC / USLT / CHAP / ... are not lost when callers only
 * touched the high-level `TagData` fields.
 */
export const KNOWN_FRAME_IDS: readonly string[] = [
  "TIT2",
  "TPE1",
  "TPE2",
  "TALB",
  "TCOM",
  "TPE3",
  "TEXT",
  "TPUB",
  "TCOP",
  "TCON",
  "TIT1",
  "TDES",
  "TLAN",
  "TSRC",
  "TYER",
  "TDRC",
  "TDOR",
  "TDRL",
  "TRCK",
  "TPOS",
  "TBPM",
];
