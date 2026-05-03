import type { PictureKindValue } from "@akabeko/music-metadata-editor";
import { CommanderError } from "commander";
import { PICTURE_KIND_BY_NAME, PICTURE_KIND_NAMES } from "./constants.js";

/**
 * Translate a `--kind` flag value into a numeric `PictureKindValue`.
 *
 * The accepted vocabulary is the CLI-only kebab-case form (`cover-front`,
 * `band-logo`, ...). Unknown names raise a {@link CommanderError} so the bin
 * layer maps the failure to exit code `2` (Usage). The error message lists
 * every recognised name to keep auto-completion-style discovery viable
 * without consulting the README.
 *
 * @param raw - Raw `--kind` value supplied by the user.
 * @returns The numeric kind value.
 * @throws {@link CommanderError} when `raw` is not a known kind name.
 */
export const parseKind = (raw: string): PictureKindValue => {
  const value = PICTURE_KIND_BY_NAME[raw];
  if (value === undefined) {
    throw new CommanderError(
      2,
      "mme.usageError",
      `--kind: unknown picture kind "${raw}" (allowed: ${PICTURE_KIND_NAMES.join(", ")})`,
    );
  }

  return value;
};
