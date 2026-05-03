import { CONTAINER_ATOM_TYPES } from "../../constants.js";

/**
 * Decide whether `type` is a container that should be recursively parsed.
 * The `meta` atom is handled separately (it carries a 4-byte version+flags
 * prefix), so it is not part of {@link CONTAINER_ATOM_TYPES} and returns
 * `false` here.
 *
 * @param type - 4-character atom type code.
 * @returns `true` for plain container atoms, `false` for leaves and `meta`.
 */
export const isContainerAtom = (type: string): boolean => CONTAINER_ATOM_TYPES.includes(type);
