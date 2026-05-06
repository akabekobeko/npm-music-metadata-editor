import type { AppSettings, DeepPartial } from "../../../main/ipc/types.js";

export type { AppSettings, DeepPartial };

/**
 * Renderer wrapper around {@link AppSettings} plus a `loaded` flag.
 *
 * UI consumers use `loaded` to suppress flickering between defaults and the
 * persisted snapshot during the very first render — `useSettings` returns the
 * built-in defaults synchronously while the IPC round-trip is in flight.
 */
export type SettingsState = {
  readonly settings: AppSettings;
  readonly loaded: boolean;
};

/** Patch function exposed by `useSettings`. */
export type UpdateSettings = (patch: DeepPartial<AppSettings>) => void;
