import type { MmeBridge } from "../../shared/bridge.js";

/**
 * Cached `MmeBridge` instance for the current Renderer.
 *
 * The bridge is provided by the preload script and is immutable across the
 * Renderer lifetime; caching it lets `getBridge` skip a `window` lookup on
 * every call.
 */
let cached: MmeBridge | undefined;

/**
 * Return the IPC bridge exposed by the preload script.
 *
 * Renderer code must reach IPC through this getter rather than touching
 * `window.mme` directly: routing through one module makes future stubbing in
 * tests trivial (`vi.mock("@/ipc/getBridge")`) and gives a single explicit
 * failure when context isolation is misconfigured.
 *
 * @returns The bridge object.
 * @throws `Error` when `window.mme` is `undefined`, meaning either the preload
 *   script never ran or context isolation is broken; we do not fall back to a
 *   silent mock because both of those failure modes are bugs that should
 *   surface immediately.
 */
export const getBridge = (): MmeBridge => {
  if (cached !== undefined) {
    return cached;
  }

  const bridge = window.mme;
  if (bridge === undefined) {
    throw new Error(
      "window.mme is undefined; preload script did not expose the bridge. " +
        "Check that contextIsolation is enabled and preload.cjs ran.",
    );
  }

  cached = bridge;
  return bridge;
};

/**
 * Reset the cached bridge.
 *
 * Test helper. Production callers do not invoke it; the bridge is set once at
 * preload time and never re-created.
 */
export const resetBridgeCache = (): void => {
  cached = undefined;
};
