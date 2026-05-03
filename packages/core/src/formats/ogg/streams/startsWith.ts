/**
 * Return `true` when `bytes` begins with every byte of `prefix`.
 *
 * Tiny utility kept private to the streams module so the codec-specific
 * `is*Packet` predicates stay one-liners.
 *
 * @param bytes - Buffer to inspect.
 * @param prefix - Prefix to match against the start of `bytes`.
 * @returns `true` when `bytes` is at least as long as `prefix` and every
 *   byte matches.
 */
export const startsWith = (bytes: Uint8Array, prefix: Uint8Array): boolean => {
  if (bytes.length < prefix.length) {
    return false;
  }

  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) {
      return false;
    }
  }

  return true;
};
