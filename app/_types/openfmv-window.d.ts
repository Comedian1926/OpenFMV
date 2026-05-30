import type { OpenFMVBridge } from '../../shared/ipc-contract';

declare global {
  interface Window {
    openfmv?: OpenFMVBridge;
  }
}

export {};
