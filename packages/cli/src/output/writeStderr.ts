import { getLogger } from "./logger.js";

/**
 * Mapping of buffered-stderr line prefixes to {@link Logger} methods.
 *
 * Command handlers buffer stderr as a string with `[mme] …` / `[warn] …` /
 * `[debug] …` markers; this dispatcher routes each line through the active
 * logger so `--quiet` / `--verbose` / `--no-color` apply uniformly. Anything
 * that does not match a known prefix is treated as an error so unexpected
 * raw output stays visible.
 */
const PREFIX_ROUTES: ReadonlyArray<{
  readonly prefix: string;
  readonly method: "info" | "warn" | "debug";
}> = [
  { prefix: "[mme] ", method: "info" },
  { prefix: "[warn] ", method: "warn" },
  { prefix: "[debug] ", method: "debug" },
];

/**
 * Strip the matched prefix from a buffered line and route the remainder
 * through the active logger.
 *
 * @param line - A single buffered stderr line (no trailing `\n`).
 */
const dispatchLine = (line: string): void => {
  const route = PREFIX_ROUTES.find(({ prefix }) => line.startsWith(prefix));
  if (route === undefined) {
    getLogger().error(line);
    return;
  }

  getLogger()[route.method](line.slice(route.prefix.length));
};

/**
 * Pump a handler's buffered stderr string through the active {@link Logger}.
 *
 * Command handlers return `stderr` as a single string (zero or more
 * `[mme] …\n` / `[warn] …\n` lines). This helper splits on `\n`, drops the
 * trailing empty token, and dispatches each line to `logger.info` /
 * `.warn` / `.debug` based on its prefix. Lines without a known prefix are
 * routed to `.error` so unexpected output is still surfaced.
 *
 * @param text - Buffered stderr payload (may be empty).
 */
export const writeStderr = (text: string): void => {
  if (text === "") {
    return;
  }

  // Buffered handlers terminate every line with `\n`, so splitting on `\n`
  // produces a trailing empty token. Slice the trailing newline first so the
  // result has no spurious blank entry to filter.
  const body = text.endsWith("\n") ? text.slice(0, -1) : text;
  body.split("\n").forEach((line) => {
    dispatchLine(line);
  });
};
