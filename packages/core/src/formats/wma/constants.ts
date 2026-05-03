/**
 * Canonical (uppercase) GUIDs of the ASF objects this module handles.
 *
 * The bytes on disk follow Microsoft's mixed-endian GUID layout (DWORD/WORD/WORD
 * little-endian, trailing 8 bytes raw). {@link decodeGuid} / {@link encodeGuid}
 * convert between these strings and the on-disk byte layout.
 */
export const ASF_GUID = {
  /** Top-level Header Object — required, contains every other meta object. */
  HeaderObject: "75B22630-668E-11CF-A6D9-00AA0062CE6C",
  /** Header Extension Object (sits inside the Header Object). */
  HeaderExtensionObject: "5FBF03B5-A92E-11CF-8EE3-00C00C205365",
  /** File Properties Object (carries total file size we have to keep in sync). */
  FilePropertiesObject: "8CABDCA1-A947-11CF-8EE4-00C00C205365",
  /** Stream Properties Object (codec / channels / sample rate). */
  StreamPropertiesObject: "B7DC0791-A9B7-11CF-8EE6-00C00C205365",
  /** Content Description Object — fixed five-field metadata block. */
  ContentDescriptionObject: "75B22633-668E-11CF-A6D9-00AA0062CE6C",
  /** Extended Content Description Object — `name -> typed value` pairs. */
  ExtendedContentDescriptionObject: "D2D0A440-E307-11D2-97F0-00A0C95EA850",
  /** Data Object — audio packets, opaque to this module. */
  DataObject: "75B22636-668E-11CF-A6D9-00AA0062CE6C",
} as const;

/** Number of bytes consumed by a GUID on disk. */
export const ASF_GUID_SIZE = 16;

/** Bytes consumed by a generic ASF object header (16-byte GUID + 8-byte size). */
export const ASF_OBJECT_HEADER_SIZE = 24;

/**
 * Bytes consumed by the Header Object's own preamble (header + 4-byte child
 * count + 2-byte reserved field) before its children begin.
 */
export const ASF_HEADER_OBJECT_PREAMBLE_SIZE = 30;

/**
 * Offset of the `File Size` field inside a File Properties Object, measured
 * from the start of the object (i.e. from its 16-byte GUID). The field sits
 * immediately after the 24-byte object header and the 16-byte File ID GUID.
 */
export const ASF_FILE_PROPERTIES_FILE_SIZE_OFFSET = ASF_OBJECT_HEADER_SIZE + 16;

/**
 * Type codes used by Extended Content Description value fields.
 *
 * These mirror the ASF specification (Revision 01.20.05). `Bool` payloads are
 * 32 bits in the Extended Content Description Object (ATL.NET's metadata
 * library object reads them as 16 bits, but that path is out of scope here).
 */
export const ASF_DESCRIPTOR_TYPE = {
  /** Null-terminated UTF-16LE string. */
  UnicodeString: 0,
  /** Opaque byte array. */
  ByteArray: 1,
  /** 32-bit boolean (`0` / `1`). */
  Bool: 2,
  /** 32-bit unsigned integer, little-endian. */
  Dword: 3,
  /** 64-bit unsigned integer, little-endian. */
  Qword: 4,
  /** 16-bit unsigned integer, little-endian. */
  Word: 5,
  /** 128-bit GUID in the on-disk Microsoft layout. */
  Guid: 6,
} as const;
