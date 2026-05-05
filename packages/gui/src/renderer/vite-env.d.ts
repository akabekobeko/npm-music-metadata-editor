/// <reference types="vite/client" />

import type { MmeBridge } from "../shared/bridge";

declare global {
  interface Window {
    readonly mme?: MmeBridge;
  }
}
