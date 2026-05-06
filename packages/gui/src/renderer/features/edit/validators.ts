import type { TagData } from "@mme/ipc";

/**
 * Outcome of validating one cell input.
 *
 * Success carries the parsed value (`undefined` means "clear the tag");
 * failure carries an English message that the editor renders as a tooltip.
 */
export type ValidationResult =
  | { readonly ok: true; readonly value: string | number | undefined }
  | { readonly ok: false; readonly message: string };

/** Acceptable integer range plus the message shown when the input is rejected. */
type IntegerRule = {
  readonly min: number;
  readonly max: number;
  readonly message: string;
};

const TRACK_INT: IntegerRule = {
  min: 1,
  max: 99999,
  message: "Must be an integer between 1 and 99999",
};

const BPM_INT: IntegerRule = {
  min: 1,
  max: 999,
  message: "BPM must be an integer between 1 and 999",
};

const DATE_PATTERN = /^\d{4}(?:-\d{2}(?:-\d{2}(?:T\d{2}:\d{2}:\d{2})?)?)?$/;
const LANGUAGE_PATTERN = /^[a-z]{2,3}$/;

/**
 * Validate a 4-digit recording year.
 *
 * @param raw - Raw text from the editor.
 * @returns `value: undefined` for empty input; the integer for `1..9999`;
 *   otherwise a failure message.
 */
const validateYear = (raw: string): ValidationResult => {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: undefined };
  }

  const n = Number(trimmed);
  if (!Number.isInteger(n)) {
    return { ok: false, message: "Year must be a 4-digit integer" };
  }

  if (n < 1 || n > 9999) {
    return { ok: false, message: "Year must be between 1 and 9999" };
  }

  return { ok: true, value: n };
};

/**
 * Validate an integer where `0` collapses to `undefined`.
 *
 * Used by track / disc / BPM columns. The "zero clears" convention follows the
 * plan so users can blank the field by typing `0` instead of selecting and
 * deleting the cell.
 *
 * @param raw - Raw text from the editor.
 * @param rule - Range and rejection message for the column.
 * @returns Parsed integer, `undefined` for empty / `0`, or a failure message.
 */
const validateIntegerWithZeroAsUndefined = (raw: string, rule: IntegerRule): ValidationResult => {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: undefined };
  }

  const n = Number(trimmed);
  if (!Number.isInteger(n)) {
    return { ok: false, message: rule.message };
  }

  if (n === 0) {
    return { ok: true, value: undefined };
  }

  if (n < rule.min || n > rule.max) {
    return { ok: false, message: rule.message };
  }

  return { ok: true, value: n };
};

/**
 * Validate a `0..5` half-integer rating and normalize it to `[0, 1]`.
 *
 * Phase 4 keeps the editor as a number input. The internal value is `n / 5`
 * because `TagData.rating` is normalized; format-specific scaling happens at
 * the core boundary.
 *
 * @param raw - Raw text from the editor.
 * @returns Normalized rating, `undefined` for empty input, or a failure message.
 */
const validateRating = (raw: string): ValidationResult => {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: undefined };
  }

  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return { ok: false, message: "Rating must be a number between 0 and 5" };
  }

  if (n < 0 || n > 5) {
    return { ok: false, message: "Rating must be between 0 and 5" };
  }

  // Accept 0, 0.5, 1, 1.5, ..., 5.
  if (Math.round(n * 2) !== n * 2) {
    return { ok: false, message: "Rating must be a multiple of 0.5" };
  }

  return { ok: true, value: n / 5 };
};

/**
 * Validate one of the supported ISO-8601 partial-date forms.
 *
 * Pattern check only — `2026-02-30` slips through because the plan does not
 * require calendar-aware validation. Round-trip through core / writers will
 * surface invalid dates as warnings later.
 *
 * @param raw - Raw text from the editor.
 * @returns The trimmed string, `undefined` for empty input, or a failure
 *   message when the shape does not match.
 */
const validateDate = (raw: string): ValidationResult => {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: undefined };
  }

  if (!DATE_PATTERN.test(trimmed)) {
    return {
      ok: false,
      message: "Date must be YYYY, YYYY-MM, YYYY-MM-DD, or YYYY-MM-DDTHH:mm:ss",
    };
  }

  return { ok: true, value: trimmed };
};

/**
 * Validate a 2- or 3-letter ISO-639 language code (lowercase).
 *
 * @param raw - Raw text from the editor.
 * @returns The trimmed code, `undefined` for empty input, or a failure
 *   message when the shape does not match.
 */
const validateLanguage = (raw: string): ValidationResult => {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: undefined };
  }

  if (!LANGUAGE_PATTERN.test(trimmed)) {
    return { ok: false, message: "Language must be a 2- or 3-letter ISO-639 code" };
  }

  return { ok: true, value: trimmed };
};

/**
 * Pass-through validator for free-form text fields.
 *
 * Whitespace is preserved — lyrics-leaning fields legitimately carry leading /
 * trailing spaces, so trimming would silently mangle valid input.
 *
 * @param raw - Raw text from the editor.
 * @returns `undefined` for empty input; otherwise the original string.
 */
const validateFreeText = (raw: string): ValidationResult => {
  if (raw === "") {
    return { ok: true, value: undefined };
  }

  return { ok: true, value: raw };
};

/**
 * Validate a string typed into a `tag.<field>` editor.
 *
 * Per-field rules follow `docs/pkg/gui/plan/phase-04-edit.md`. Empty input is
 * always treated as "clear the tag" (`value: undefined`); shape errors carry
 * an English message that the editor surfaces via tooltip.
 *
 * @param field - `TagData` key the cell is bound to.
 * @param raw - Raw text the user typed into the editor.
 * @returns Validation result with the parsed value, or a failure message.
 */
export const validateTagValue = (field: keyof TagData, raw: string): ValidationResult => {
  if (field === "year") {
    return validateYear(raw);
  }

  if (
    field === "trackNumber" ||
    field === "trackTotal" ||
    field === "discNumber" ||
    field === "discTotal"
  ) {
    return validateIntegerWithZeroAsUndefined(raw, TRACK_INT);
  }

  if (field === "bpm") {
    return validateIntegerWithZeroAsUndefined(raw, BPM_INT);
  }

  if (field === "rating") {
    return validateRating(raw);
  }

  if (field === "recordingDate" || field === "originalReleaseDate" || field === "publishingDate") {
    return validateDate(raw);
  }

  if (field === "language") {
    return validateLanguage(raw);
  }

  return validateFreeText(raw);
};
