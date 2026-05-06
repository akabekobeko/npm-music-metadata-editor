import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { defaultSettings } from "./defaults.js";
import type { AppSettings, DeepPartial, SettingsState, UpdateSettings } from "./types.js";

type ContextValue = {
  /** Current settings snapshot plus the `loaded` flag. */
  readonly state: SettingsState;
  /** Patch helper exposed by `useSettings`. */
  readonly update: UpdateSettings;
};

const SettingsContext = createContext<ContextValue | null>(null);

/**
 * Provider that hydrates settings from `mme:settings:get` on mount and exposes
 * a `setSettings(patch)` helper that round-trips through `mme:settings:set`.
 *
 * The IPC response is the source of truth for the in-memory snapshot — this
 * keeps Renderer state in lockstep with what Main wrote to disk after merge,
 * avoiding subtle drift on edge cases like sanitised column widths.
 *
 * @param props - React children to render under the provider.
 * @returns The provider element.
 */
export const SettingsProvider = ({ children }: { readonly children: ReactNode }): ReactNode => {
  const [state, setState] = useState<SettingsState>(() => ({
    settings: defaultSettings,
    loaded: false,
  }));

  useEffect(() => {
    let cancelled = false;
    void window.mme.settings.get().then((response) => {
      if (cancelled || !response.ok) {
        return;
      }

      setState({ settings: response.value, loaded: true });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback<UpdateSettings>((patch) => {
    void applyPatchOverIpc(patch).then((next) => {
      if (next === null) {
        return;
      }

      setState({ settings: next, loaded: true });
    });
  }, []);

  return createElement(SettingsContext.Provider, { value: { state, update } }, children);
};

/**
 * Hook returning the current settings plus a typed patch helper.
 *
 * @returns `[settings, setSettings]`. `setSettings` is fire-and-forget; the
 *   resulting state arrives back through the context after the IPC response.
 */
export const useSettings = (): readonly [AppSettings, UpdateSettings] => {
  const ctx = useContext(SettingsContext);
  if (ctx === null) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }

  return [ctx.state.settings, ctx.update] as const;
};

/**
 * Hook returning whether the initial `mme:settings:get` round-trip has resolved.
 *
 * @returns `true` once the persisted snapshot has been merged into state.
 */
export const useSettingsLoaded = (): boolean => {
  const ctx = useContext(SettingsContext);
  return ctx?.state.loaded ?? false;
};

/**
 * Send a patch through `mme:settings:set` and return the merged snapshot, or
 * `null` if the IPC envelope itself failed.
 *
 * @param patch - Deeply-partial overrides.
 * @returns The merged settings on success, or `null` on transport failure.
 */
const applyPatchOverIpc = async (patch: DeepPartial<AppSettings>): Promise<AppSettings | null> => {
  const response = await window.mme.settings.set({ patch });
  return response.ok ? response.value : null;
};
