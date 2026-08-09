/** Byte range of printable ASCII allowed in a plausible atom type. */
const PRINTABLE_MIN = 0x20;
const PRINTABLE_MAX = 0x7e;
/** iTunes-style atoms prefix their type with the copyright sign (e.g. `©nam`). */
const COPYRIGHT_SIGN = 0xa9;

/**
 * Judge whether a 4-character code decoded from a box header looks like a real
 * atom type. Registered ISO BMFF / QuickTime types consist of printable ASCII,
 * optionally with the `©` (0xA9) prefix used by iTunes metadata atoms.
 *
 * Used to distinguish trailing garbage (e.g. leftovers from an in-place tag
 * rewrite, whose "type" bytes are audio data) from a genuinely truncated atom:
 * only the former may be tolerated, the latter must keep raising an error.
 *
 * @param type - 4-character type decoded as Latin-1.
 * @returns `true` when every character is plausible in an atom type.
 */
export const isPlausibleAtomType = (type: string): boolean => {
  for (let i = 0; i < type.length; i += 1) {
    const code = type.charCodeAt(i);
    if ((code < PRINTABLE_MIN || code > PRINTABLE_MAX) && code !== COPYRIGHT_SIGN) {
      return false;
    }
  }

  return true;
};
