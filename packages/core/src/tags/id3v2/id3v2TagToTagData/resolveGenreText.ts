import { ID3V1_GENRES } from "../../id3v1/constants.js";

/** ID3v2 special content-type codes mapped to fixed genre names. */
const SPECIAL_GENRES: Readonly<Record<string, string>> = {
  RX: "Remix",
  CR: "Cover",
};

/** Matches a leading `(nn)` / `(RX)` / `(CR)` content-type reference. */
const REFERENCE_PATTERN = /^\((\d+|RX|CR)\)/;

/** Matches a bare ID3v2.4-style content-type value (`"17"` / `"RX"` / `"CR"`). */
const BARE_REFERENCE_PATTERN = /^(?:\d+|RX|CR)$/;

/**
 * Resolve one reference token (without parentheses) to a genre name.
 *
 * @param token - `"RX"`, `"CR"`, or a decimal ID3v1 genre code.
 * @returns The genre name, or `undefined` when the token maps to nothing.
 */
const resolveReference = (token: string): string | undefined => {
  const special = SPECIAL_GENRES[token];
  if (special !== undefined) {
    return special;
  }

  const code = Number.parseInt(token, 10);
  return code < ID3V1_GENRES.length ? ID3V1_GENRES[code] : undefined;
};

/**
 * Resolve the ID3v2 `TCON` numeric genre notation into a plain genre name.
 *
 * ID3v2.2/2.3 reference the ID3v1 genre table as `(nn)`, optionally followed
 * by a free-text refinement that takes precedence, plus the special codes
 * `(RX)` (remix) and `(CR)` (cover). A literal value starting with `(` is
 * escaped as `((`. ID3v2.4 drops the parentheses and stores the bare code.
 *
 * @param text - Raw `TCON` frame text.
 * @returns The resolved genre name, or `text` unchanged when nothing resolves.
 */
export const resolveGenreText = (text: string): string => {
  if (BARE_REFERENCE_PATTERN.test(text)) {
    return resolveReference(text) ?? text;
  }

  const names: string[] = [];
  let rest = text;
  while (rest !== "") {
    if (rest.startsWith("((")) {
      // "((" escapes a literal value that starts with "(".
      rest = rest.slice(1);
      break;
    }

    const matched = REFERENCE_PATTERN.exec(rest);
    if (matched === null) {
      break;
    }

    const name = resolveReference(matched[1] as string);
    if (name !== undefined) {
      names.push(name);
    }

    rest = rest.slice(matched[0].length);
  }

  if (rest !== "" && rest !== text) {
    // The refinement replaces the referenced genres (ID3v2.3 §4.2.1 TCON).
    return rest;
  }

  if (names.length > 0) {
    return names.join("/");
  }

  return text;
};
