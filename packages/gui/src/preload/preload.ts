import { contextBridge } from "electron";
import type { MmeBridge } from "../shared/bridge.js";

const bridge: MmeBridge = {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
};

contextBridge.exposeInMainWorld("mme", bridge);
