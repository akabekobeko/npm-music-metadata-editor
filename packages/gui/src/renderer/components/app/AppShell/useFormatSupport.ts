import { useEffect, useState } from "react";

import type { FormatSupportMap } from "@/features/spreadsheet/types";

/**
 * Fetch and cache the format support matrix for the lifetime of the renderer.
 *
 * Returns an empty map until the IPC round-trip resolves so consumers can
 * still render (every cell falls back to "not writable" before the matrix
 * arrives, which matches the disabled-cell story).
 *
 * @returns The format support matrix keyed by audio format.
 */
export const useFormatSupport = (): FormatSupportMap => {
  const [support, setSupport] = useState<FormatSupportMap>(() => new Map());
  useEffect(() => {
    let cancelled = false;
    void window.mme.formatSupport.list().then((response) => {
      if (cancelled || !response.ok) {
        return;
      }

      const next = new Map(response.value.map((entry) => [entry.format, entry]));
      setSupport(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return support;
};
