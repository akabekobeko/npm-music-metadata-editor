import { useEffect } from "react";

/**
 * Forward `console.error` / `console.warn` calls into Main so the file log
 * captures both halves of the application.
 *
 * Patches the original methods in place rather than swapping `console`
 * itself: this keeps the DevTools UI behaviour intact (each log still shows
 * the original source line). The original methods are restored when the
 * effect tears down so React HMR cycles don't double-wrap.
 */
export const useLogForwarder = (): void => {
  useEffect(() => {
    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);

    const forwardError = (...args: unknown[]): void => {
      originalError(...args);
      window.mme.log.forward({
        level: "error",
        message: stringify(args),
      });
    };

    const forwardWarn = (...args: unknown[]): void => {
      originalWarn(...args);
      window.mme.log.forward({
        level: "warn",
        message: stringify(args),
      });
    };

    console.error = forwardError;
    console.warn = forwardWarn;
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);
};

/**
 * Coerce a console-style argument list into a single string.
 *
 * Mirrors what Chromium would render in DevTools: scalars stringify
 * directly, `Error` instances expose `stack`, and everything else flows
 * through `JSON.stringify` with a fallback to `String(value)`.
 *
 * @param args - The console-style argument list.
 * @returns A single-line summary.
 */
const stringify = (args: readonly unknown[]): string =>
  args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.stack ?? arg.message;
      }

      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }

      return String(arg);
    })
    .join(" ");
