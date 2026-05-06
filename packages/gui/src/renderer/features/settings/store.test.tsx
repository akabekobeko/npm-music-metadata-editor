// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { type ReactNode, useEffect } from "react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { defaultSettings } from "./defaults.js";
import { SettingsProvider, useSettings, useSettingsLoaded } from "./store.js";
import type { AppSettings } from "./types.js";

type FakeBridge = {
  current: AppSettings;
  loadResolver: ((value: AppSettings) => void) | null;
  setCalls: AppSettings[];
};

const bridge: FakeBridge = {
  current: defaultSettings,
  loadResolver: null,
  setCalls: [],
};

beforeEach(() => {
  bridge.current = defaultSettings;
  bridge.loadResolver = null;
  bridge.setCalls = [];
  Object.defineProperty(window, "mme", {
    configurable: true,
    value: {
      settings: {
        get: () =>
          new Promise<{ ok: true; value: AppSettings }>((resolve) => {
            bridge.loadResolver = (value) => resolve({ ok: true, value });
          }),
        set: ({ patch }: { patch: Partial<AppSettings> }) => {
          // Trivial deep-merge for test purposes (sufficient for store coverage).
          bridge.current = {
            ...bridge.current,
            ...patch,
            columns: { ...bridge.current.columns, ...(patch.columns ?? {}) },
            window: { ...bridge.current.window, ...(patch.window ?? {}) },
          };
          bridge.setCalls.push(bridge.current);
          return Promise.resolve({ ok: true as const, value: bridge.current });
        },
      },
    },
  });
});

afterEach(() => {
  cleanup();
});

const Probe = ({
  onSettings,
  onUpdate,
}: {
  readonly onSettings: (s: AppSettings) => void;
  readonly onUpdate?: (update: ReturnType<typeof useSettings>[1]) => void;
}): ReactNode => {
  const [settings, update] = useSettings();
  const loaded = useSettingsLoaded();
  useEffect(() => {
    onSettings(settings);
    onUpdate?.(update);
  }, [settings, update, onSettings, onUpdate]);
  return <span data-testid="loaded">{loaded ? "yes" : "no"}</span>;
};

it("starts with defaults and unloaded, then hydrates from the IPC bridge", async () => {
  const seen: AppSettings[] = [];
  render(
    <SettingsProvider>
      <Probe onSettings={(s) => seen.push(s)} />
    </SettingsProvider>,
  );

  expect(screen.getByTestId("loaded").textContent).toBe("no");
  expect(seen[0]).toEqual(defaultSettings);

  await act(async () => {
    bridge.loadResolver?.({
      ...defaultSettings,
      window: { ...defaultSettings.window, width: 1500 },
    });
  });

  expect(screen.getByTestId("loaded").textContent).toBe("yes");
  const last = seen.at(-1);
  expect(last?.window.width).toBe(1500);
});

it("update sends a patch and replaces local state with the IPC response", async () => {
  let updater: ReturnType<typeof useSettings>[1] | null = null;
  render(
    <SettingsProvider>
      <Probe onSettings={() => {}} onUpdate={(u) => (updater = u)} />
    </SettingsProvider>,
  );

  await act(async () => {
    bridge.loadResolver?.(defaultSettings);
  });

  await act(async () => {
    updater?.({ window: { width: 1024 } });
    // Allow the awaited Promise inside `update` to settle.
    await Promise.resolve();
  });

  expect(bridge.setCalls).toHaveLength(1);
  expect(bridge.setCalls[0]?.window.width).toBe(1024);
});
