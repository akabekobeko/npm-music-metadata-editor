import type { Warning } from "@akabeko/music-metadata-editor";

/**
 * Emit a single warning to stderr.
 *
 * Phase 1 prints in a fixed `[warn] <message>` shape. Phase 2 introduces
 * severity-aware coloring; callers do not need to migrate when that lands
 * because `severity` already flows through the input.
 *
 * @param warning - Warning record produced by the core readers.
 */
export const printWarning = (warning: Warning): void =>
  void process.stderr.write(`[warn] ${warning.message}\n`);
