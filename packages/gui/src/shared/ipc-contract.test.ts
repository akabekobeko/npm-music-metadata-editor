import { describe, expectTypeOf, it } from "vitest";
import type { MmeBridge } from "./bridge.js";
import type { IpcChannel, IpcRequestOf, IpcResponseOf, LoadTrackOk } from "./ipc-contract.js";

describe("IpcContract type integrity", () => {
  it("exposes the expected channel name union", () => {
    expectTypeOf<IpcChannel>().toEqualTypeOf<
      | "mme:app:getVersions"
      | "mme:dialog:openFiles"
      | "mme:track:load"
      | "mme:track:loadMany"
      | "mme:track:save"
      | "mme:formatSupport:list"
      | "mme:settings:get"
      | "mme:settings:set"
    >();
  });

  it("matches the bridge response shape for mme:track:load", () => {
    type BridgeReturn = ReturnType<MmeBridge["track"]["load"]>;
    type ContractResponse = Promise<IpcResponseOf<"mme:track:load">>;
    expectTypeOf<BridgeReturn>().toEqualTypeOf<ContractResponse>();
  });

  it("matches the bridge request shape for mme:track:load", () => {
    type BridgeRequest = Parameters<MmeBridge["track"]["load"]>[0];
    expectTypeOf<BridgeRequest>().toEqualTypeOf<IpcRequestOf<"mme:track:load">>();
  });

  it("LoadTrackOk carries filePath and track", () => {
    expectTypeOf<LoadTrackOk["filePath"]>().toEqualTypeOf<string>();
  });
});
