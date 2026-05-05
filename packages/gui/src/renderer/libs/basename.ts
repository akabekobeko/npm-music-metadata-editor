/**
 * Return the last segment of a POSIX or Windows path.
 *
 * Renderer cannot import `node:path`, so the spreadsheet derives the file's
 * display name with this lightweight helper instead.
 *
 * @param filePath - Absolute or relative path to take the basename of.
 * @returns Final segment after the last `/` or `\`. Falls back to the input
 *   itself when neither separator is present.
 */
export const basename = (filePath: string): string => {
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  return lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
};
