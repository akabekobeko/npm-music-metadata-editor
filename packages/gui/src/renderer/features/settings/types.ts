import type { AppSettings, DeepPartial } from "@mme/ipc";

export type { AppSettings, DeepPartial };

/**
 * Renderer wrapper around {@link AppSettings} plus a `loaded` flag.
 *
 * UI consumers use `loaded` to suppress flickering between defaults and the
 * persisted snapshot during the very first render — `useSettings` returns the
 * built-in defaults synchronously while the IPC round-trip is in flight.
 */
export type SettingsState = {
  /** Latest settings snapshot — falls back to defaults until `loaded` flips. */
  readonly settings: AppSettings;
  /** `true` once the initial `mme:settings:get` round-trip has resolved. */
  readonly loaded: boolean;
};

/** Patch function exposed by `useSettings`. */
export type UpdateSettings = (patch: DeepPartial<AppSettings>) => void;
