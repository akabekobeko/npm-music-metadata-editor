/** ASCII bytes for the Monkey's Audio file magic (`"MAC "`). */
export const APE_FILE_MAGIC = new Uint8Array([0x4d, 0x41, 0x43, 0x20]);

/** Size of the common header (`"MAC "` + version) in bytes. */
export const APE_COMMON_HEADER_SIZE = 6;

/**
 * Cut-off APE version that distinguishes the legacy header layout (≤ 3.97)
 * from the modern descriptor + new header layout (≥ 3.98).
 *
 * The version field stores `version * 1000`, so `3980` means MAC SDK 3.98.
 */
export const APE_NEW_HEADER_MIN_VERSION = 3980;

/** Size in bytes of the "old" Monkey's Audio header (versions <= 3.97). */
export const APE_OLD_HEADER_SIZE = 32;

/** Size in bytes of the descriptor that precedes the new header (versions >= 3.98). */
export const APE_DESCRIPTOR_SIZE = 52;

/** Size in bytes of the new Monkey's Audio header (versions >= 3.98). */
export const APE_NEW_HEADER_SIZE = 24;
