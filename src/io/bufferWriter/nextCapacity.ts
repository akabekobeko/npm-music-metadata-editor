/** Arguments for {@link nextCapacity}. */
type Args = {
  /** Current capacity in bytes (must be `>= 1`). */
  current: number;
  /** Required capacity in bytes (must be `> current`). */
  required: number;
};

/**
 * Compute the smallest doubling of `current` that fits `required` bytes.
 *
 * Used by the writer's grow strategy: each overflow doubles capacity, so a
 * single allocation handles the new bytes without repeated reallocation when
 * subsequent writes stay below the new size.
 *
 * @returns The new capacity (always `>= required`).
 */
export const nextCapacity = ({ current, required }: Args): number => {
  let next = current;
  while (next < required) {
    next *= 2;
  }

  return next;
};
