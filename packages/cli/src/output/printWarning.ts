import type { Warning } from "@akabeko/music-metadata-editor";
import { getLogger } from "./logger.js";

/**
 * Emit a single warning through the active {@link Logger}.
 *
 * The logger owns the `[warn] ` prefix and ANSI styling; this helper just
 * forwards the raw message. `--quiet` suppresses the line; `--verbose` does
 * not add anything (warnings are visible by default already).
 *
 * @param warning - Warning record produced by the core readers.
 */
export const printWarning = (warning: Warning): void => getLogger().warn(warning.message);
