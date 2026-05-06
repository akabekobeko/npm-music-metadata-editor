import { useEffect, useState } from "react";
import type { FatalPayload } from "../../../../main/ipc/types.js";

/**
 * Wire the Main → Renderer `mme:fatal` channel and the renderer's own
 * `window.onerror` / `unhandledrejection` listeners.
 *
 * Side effect: the Renderer side also reports back through `fatal.report`
 * so Main's electron-log captures the same payload. The first fatal "wins";
 * subsequent fatals are folded into the same modal until the user dismisses.
 *
 * @returns Tuple of `[fatal, dismiss]`.
 */
export const useFatalHandler = (): readonly [FatalPayload | null, () => void] => {
  const [fatal, setFatal] = useState<FatalPayload | null>(null);

  useEffect(() => {
    const unsubscribe = window.mme.fatal.onError((payload) => {
      setFatal((prev) => prev ?? payload);
    });

    const onWindowError = (event: ErrorEvent): void => {
      const payload: FatalPayload = {
        source: "renderer",
        message: event.error instanceof Error ? event.error.message : event.message,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      };
      setFatal((prev) => prev ?? payload);
      window.mme.fatal.report(payload);
    };

    const onRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason;
      const payload: FatalPayload = {
        source: "renderer",
        message: reason instanceof Error ? reason.message : `${String(reason)}`,
        stack: reason instanceof Error ? reason.stack : undefined,
      };
      setFatal((prev) => prev ?? payload);
      window.mme.fatal.report(payload);
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      unsubscribe();
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return [fatal, () => setFatal(null)] as const;
};
