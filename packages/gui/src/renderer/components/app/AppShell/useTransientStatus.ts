import { useCallback, useEffect, useRef, useState } from "react";

import { TRANSIENT_STATUS_MS } from "./constants.js";

/**
 * Public surface returned by {@link useTransientStatus}.
 */
export type TransientStatus = {
  /** Current transient message, or `null` when nothing is shown. */
  readonly transient: string | null;
  /** Show a message; auto-hides after {@link TRANSIENT_STATUS_MS} ms. */
  readonly show: (message: string) => void;
};

/**
 * Manage a single short-lived status message slot.
 *
 * The timer is held in a ref so successive `show` calls reset the countdown
 * (the most-recent message wins, the older one would be hidden anyway). The
 * mount-cleanup unsubscribes so unmounting during a fade doesn't trigger a
 * setState on a stale instance.
 *
 * @returns Current transient text and a `show` setter.
 */
export const useTransientStatus = (): TransientStatus => {
  const [transient, setTransient] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string): void => {
    setTransient(message);
    if (timer.current !== null) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => setTransient(null), TRANSIENT_STATUS_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  return { transient, show };
};
