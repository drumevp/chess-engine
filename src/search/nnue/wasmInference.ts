import {
  NNUE_FC_0_WEIGHT_COUNT,
  NNUE_FC_0_OUTPUTS_WITH_BUCKET,
  NNUE_FC_1_OUTPUTS,
  NNUE_FC_1_WEIGHT_COUNT,
  NNUE_FC_2_WEIGHT_COUNT,
  NNUE_LAYER_STACKS,
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
} from "../constants/nnue";
import type { NnueModel } from "../types/nnue";
import nnueWasmBase64 from "./nnueWasmBinary.generated";

type NnueWasmExports = {
  memory: { readonly buffer: ArrayBuffer };
  getWhiteAccumulatorPointer: () => number;
  getBlackAccumulatorPointer: () => number;
  getFc0BiasPointer: () => number;
  getFc0WeightPointer: () => number;
  getFc1BiasPointer: () => number;
  getFc1WeightPointer: () => number;
  getFc2BiasPointer: () => number;
  getFc2WeightPointer: () => number;
  forward: (layerStackIndex: number, sideToMove: number) => number;
};

type WebAssemblyApi = {
  Module: new (bytes: Uint8Array) => unknown;
  Instance: new (
    module: unknown,
  ) => { readonly exports: Record<string, unknown> };
};

export type NnueNetworkForward = {
  forward: (
    whiteAccumulator: Int32Array,
    blackAccumulator: Int32Array,
    sideToMove: number,
    layerStackIndex: number,
  ) => number;
};

const webAssembly = (
  globalThis as unknown as { readonly WebAssembly: WebAssemblyApi }
).WebAssembly;

let cachedModule: unknown | null = null;

const decodeWasm = (): Uint8Array => {
  const binary = atob(nnueWasmBase64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const getWasmModule = (): unknown => {
  if (cachedModule === null) {
    if (nnueWasmBase64.length === 0) {
      throw new Error("NNUE WASM binary is missing; run npm run build");
    }

    cachedModule = new webAssembly.Module(decodeWasm());
  }

  return cachedModule;
};

const copyLayerStackWeights = (
  model: NnueModel,
  memory: { readonly buffer: ArrayBuffer },
  exports: NnueWasmExports,
): void => {
  const fc0Biases = new Int32Array(
    memory.buffer,
    exports.getFc0BiasPointer(),
    NNUE_LAYER_STACKS * NNUE_FC_0_OUTPUTS_WITH_BUCKET,
  );
  const fc0Weights = new Int8Array(
    memory.buffer,
    exports.getFc0WeightPointer(),
    NNUE_LAYER_STACKS * NNUE_FC_0_WEIGHT_COUNT,
  );
  const fc1Biases = new Int32Array(
    memory.buffer,
    exports.getFc1BiasPointer(),
    NNUE_LAYER_STACKS * NNUE_FC_1_OUTPUTS,
  );
  const fc1Weights = new Int8Array(
    memory.buffer,
    exports.getFc1WeightPointer(),
    NNUE_LAYER_STACKS * NNUE_FC_1_WEIGHT_COUNT,
  );
  const fc2Biases = new Int32Array(
    memory.buffer,
    exports.getFc2BiasPointer(),
    NNUE_LAYER_STACKS,
  );
  const fc2Weights = new Int8Array(
    memory.buffer,
    exports.getFc2WeightPointer(),
    NNUE_LAYER_STACKS * NNUE_FC_2_WEIGHT_COUNT,
  );

  for (let stack = 0; stack < NNUE_LAYER_STACKS; stack++) {
    const weights = model.weights.layerStacks[stack];

    fc0Biases.set(weights.fc0Bias, stack * NNUE_FC_0_OUTPUTS_WITH_BUCKET);
    fc0Weights.set(weights.fc0Weights, stack * NNUE_FC_0_WEIGHT_COUNT);
    fc1Biases.set(weights.fc1Bias, stack * NNUE_FC_1_OUTPUTS);
    fc1Weights.set(weights.fc1Weights, stack * NNUE_FC_1_WEIGHT_COUNT);
    fc2Biases.set(weights.fc2Bias, stack);
    fc2Weights.set(weights.fc2Weights, stack * NNUE_FC_2_WEIGHT_COUNT);
  }
};

export const createWasmNnueNetworkForward = (
  model: NnueModel,
): NnueNetworkForward => {
  const instance = new webAssembly.Instance(getWasmModule());
  const exports = instance.exports as unknown as NnueWasmExports;
  const { memory } = exports;

  copyLayerStackWeights(model, memory, exports);

  const whiteAccumulator = new Int32Array(
    memory.buffer,
    exports.getWhiteAccumulatorPointer(),
    NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
  );
  const blackAccumulator = new Int32Array(
    memory.buffer,
    exports.getBlackAccumulatorPointer(),
    NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
  );

  return {
    forward: (white, black, sideToMove, layerStackIndex): number => {
      whiteAccumulator.set(white);
      blackAccumulator.set(black);

      return exports.forward(layerStackIndex, sideToMove);
    },
  };
};
