/** Frame ID of the popularimeter frame (v2.2 `POP` is upgraded to this at parse time). */
export const POPM_FRAME_ID = "POPM";

/**
 * E-mail written into a freshly synthesized `POPM` frame.
 *
 * Windows Explorer / Windows Media Player only display ratings stored under
 * this identifier, and most taggers offer it as the compatible default, so
 * it maximises the chance the rating shows up elsewhere. Existing frames
 * keep whatever e-mail they already carry.
 */
export const POPM_DEFAULT_EMAIL = "Windows Media Player 9 Series";

/** Play-counter bytes appended to a freshly synthesized `POPM` frame (32-bit zero). */
export const POPM_DEFAULT_COUNTER: Uint8Array = new Uint8Array(4);
