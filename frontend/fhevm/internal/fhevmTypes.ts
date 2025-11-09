import type { FhevmInstance } from "../fhevmTypes";

export type FhevmRelayerSDKType = {
  __initialized__?: boolean;
  initSDK: (options?: FhevmInitSDKOptions) => Promise<boolean>;
  createInstance: (options: any) => Promise<FhevmInstance>;
  SepoliaConfig: any;
};

export type FhevmWindowType = Window & { relayerSDK: FhevmRelayerSDKType };

export type FhevmInitSDKOptions = {
  endpoint?: string;
};

export type FhevmLoadSDKType = () => Promise<void>;
export type FhevmInitSDKType = (options?: FhevmInitSDKOptions) => Promise<boolean>;


