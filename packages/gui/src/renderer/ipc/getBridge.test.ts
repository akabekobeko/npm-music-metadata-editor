import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MmeBridge } from "../../shared/bridge.js";
import { getBridge, resetBridgeCache } from "./getBridge.js";

const buildFakeBridge = (): MmeBridge =>
  ({
    versions: { node: "x", chrome: "y", electron: "z" },
    app: { getVersions: async () => ({}) as never },
    dialog: { openFiles: async () => ({}) as never },
    track: {
      load: async () => ({}) as never,
      loadMany: async () => ({}) as never,
      save: async () => ({}) as never,
    },
    formatSupport: { list: async () => ({}) as never },
    settings: {
      get: async () => ({}) as never,
      set: async () => ({}) as never,
    },
    progress: { onSave: () => () => undefined },
  }) as MmeBridge;

beforeEach(() => {
  resetBridgeCache();
});

afterEach(() => {
  resetBridgeCache();
  delete (globalThis as { mme?: MmeBridge }).mme;
  delete (globalThis as { window?: { mme?: MmeBridge } }).window;
});

describe("getBridge", () => {
  it("returns the bridge exposed via window.mme", () => {
    const bridge = buildFakeBridge();
    (globalThis as { window?: { mme?: MmeBridge } }).window = { mme: bridge };

    expect(getBridge()).toBe(bridge);
  });

  it("caches subsequent calls", () => {
    const bridge = buildFakeBridge();
    (globalThis as { window?: { mme?: MmeBridge } }).window = { mme: bridge };

    const first = getBridge();
    (globalThis as { window?: { mme?: MmeBridge } }).window = { mme: undefined };

    expect(getBridge()).toBe(first);
  });

  it("throws when window.mme is undefined", () => {
    (globalThis as { window?: { mme?: MmeBridge } }).window = { mme: undefined };

    expect(() => getBridge()).toThrow(/window\.mme is undefined/);
  });
});
