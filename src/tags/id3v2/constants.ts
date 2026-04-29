/** Bytes for the `"ID3"` magic that opens an ID3v2 header. */
export const ID3V2_MAGIC = new Uint8Array([0x49, 0x44, 0x33]);

/** Length of the fixed ID3v2 header. */
export const ID3V2_HEADER_SIZE = 10;

/** Bit mask for the tag-level "unsynchronisation" header flag. */
export const ID3V2_FLAG_UNSYNCH = 0x80;

/** Bit mask for the tag-level "extended header" header flag. */
export const ID3V2_FLAG_EXTENDED = 0x40;

/** Bit mask for the tag-level "experimental" header flag. */
export const ID3V2_FLAG_EXPERIMENTAL = 0x20;

/** Bit mask for the tag-level "footer present" header flag (ID3v2.4 only). */
export const ID3V2_FLAG_FOOTER = 0x10;

/** Sentinel raised by parsers when a frame body is encrypted or compressed. */
export const ID3V2_UNSUPPORTED_FRAME = "ID3v2 frame uses compression/encryption (unsupported)";

/**
 * Mapping from ID3v2.3 / 2.4 text frame ID to a `TagData` field name.
 *
 * Only frames that have a 1:1 correspondence with our public `TagData` shape
 * appear here. Frames not in the map (e.g. `TKEY`, `TENC`) are still parsed,
 * preserved, and re-emitted on write — they just do not surface through the
 * high-level reader API.
 *
 * Source: ATL.NET `frameMapping_v23` / `frameMapping_v24`.
 */
export const ID3V2_TEXT_FRAME_MAP: Readonly<Record<string, string>> = {
  TIT2: "title",
  TPE1: "artist",
  TPE2: "albumArtist",
  TALB: "album",
  TCOM: "composer",
  TPE3: "conductor",
  TEXT: "lyricist",
  TPUB: "publisher",
  TCOP: "copyright",
  TCON: "genre",
  TIT1: "group",
  TDES: "description",
  TLAN: "language",
  TSRC: "isrc",
  TYER: "year",
  TDRC: "recordingDate",
  TDOR: "originalReleaseDate",
  TDRL: "publishingDate",
  TRCK: "trackNumber",
  TPOS: "discNumber",
  TBPM: "bpm",
};

/**
 * ID3v2.2 → 2.3/2.4 frame ID upgrade table.
 *
 * Used during read so that v2.2 frames flow through the same downstream parsers
 * as their v2.3 equivalents. Source: ATL.NET `frameMapping_v22_4`.
 */
export const ID3V2_2_TO_2_3_FRAME_ID: Readonly<Record<string, string>> = {
  BUF: "RBUF",
  CNT: "PCNT",
  COM: "COMM",
  CRA: "AENC",
  ETC: "ETCO",
  EQU: "EQU2",
  GEO: "GEOB",
  IPL: "TIPL",
  LNK: "LINK",
  MCI: "MCDI",
  MLL: "MLLT",
  PIC: "APIC",
  POP: "POPM",
  REV: "RVRB",
  RVA: "RVA2",
  SLT: "SYLT",
  STC: "SYTC",
  TAL: "TALB",
  TBP: "TBPM",
  TCM: "TCOM",
  TCO: "TCON",
  TCR: "TCOP",
  TDA: "TDAT",
  TDY: "TDLY",
  TEN: "TENC",
  TFT: "TFLT",
  TIM: "TIME",
  TKE: "TKEY",
  TLA: "TLAN",
  TLE: "TLEN",
  TMT: "TMED",
  TOA: "TOPE",
  TOF: "TOFN",
  TOL: "TOLY",
  TOR: "TORY",
  TOT: "TOAL",
  TP1: "TPE1",
  TP2: "TPE2",
  TP3: "TPE3",
  TP4: "TPE4",
  TPA: "TPOS",
  TPB: "TPUB",
  TRC: "TSRC",
  TRK: "TRCK",
  TSS: "TSSE",
  TT1: "TIT1",
  TT2: "TIT2",
  TT3: "TIT3",
  TXT: "TEXT",
  TXX: "TXXX",
  TYE: "TYER",
  UFI: "UFID",
  ULT: "USLT",
  WAF: "WOAF",
  WAR: "WOAR",
  WAS: "WOAS",
  WCM: "WCOM",
  WCP: "WCOP",
  WPB: "WPUB",
  WXX: "WXXX",
};

/** ID3v2 text-encoding byte → encoding name expected by the I/O helpers. */
export const ID3V2_TEXT_ENCODINGS = {
  /** `0x00` — ISO-8859-1. */
  Latin1: 0x00,
  /** `0x01` — UTF-16 with BOM. */
  Utf16WithBom: 0x01,
  /** `0x02` — UTF-16BE without BOM (ID3v2.4+). */
  Utf16Be: 0x02,
  /** `0x03` — UTF-8 (ID3v2.4+). */
  Utf8: 0x03,
} as const;
