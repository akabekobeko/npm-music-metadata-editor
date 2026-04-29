/** Arguments for {@link skipExtendedHeader}. */
export type SkipExtendedHeaderArgs = {
  /** Tag body (already de-unsynchronised). */
  body: Uint8Array;
  /** `true` for ID3v2.4 (extended header size is sync-safe), `false` for ID3v2.3. */
  syncSafe: boolean;
};

/**
 * Skip the v2.3 / v2.4 extended header.
 *
 * @returns The offset (within `body`) where frame parsing should start, or `-1`
 *   when the extended header is malformed.
 */
export const skipExtendedHeader = (args: SkipExtendedHeaderArgs): number => {
  const { body, syncSafe } = args;
  if (body.length < 4) {
    return -1;
  }

  const size = syncSafe
    ? ((body[0] as number) << 21) |
      ((body[1] as number) << 14) |
      ((body[2] as number) << 7) |
      (body[3] as number)
    : (body[0] as number) * 0x1000000 +
      ((body[1] as number) << 16) +
      ((body[2] as number) << 8) +
      (body[3] as number);

  // ID3v2.3: `size` excludes the 4-byte size field itself.
  // ID3v2.4: `size` includes the 4-byte size field.
  const consumed = syncSafe ? size : 4 + size;
  if (consumed > body.length) {
    return -1;
  }

  return consumed;
};
