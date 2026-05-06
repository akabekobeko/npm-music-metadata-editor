// Settings types live on the IPC boundary because both Main and Renderer need
// them, and the IPC types module is the project's shared narrow waist. Re-export
// here so callers inside the settings module can keep their imports local.
export type { AppSettings, DeepPartial } from "../ipc/types.js";
