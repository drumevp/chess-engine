import {
  NNUE_FC_0_WEIGHT_COUNT,
  NNUE_FC_0_OUTPUTS_WITH_BUCKET,
  NNUE_FC_1_OUTPUTS,
  NNUE_FC_1_WEIGHT_COUNT,
  NNUE_FC_2_WEIGHT_COUNT,
  NNUE_HALF_KA_FEATURE_DIMENSIONS,
  NNUE_LAYER_STACKS,
  NNUE_MAX_ACTIVE_HALF_KA_FEATURES,
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
} from "../constants/nnue";
import type {
  NnueAccumulatorBackend,
  NnueModel,
} from "../types/nnue";
import nnueWasmBase64 from "./nnueWasmBinary.generated";
import {
  createWasmAccumulatorBackend,
  getWasmAccumulatorSlot,
} from "./wasmAccumulator";

type NnueWasmExports = {
  memory: { readonly buffer: ArrayBuffer };
  getAccumulatorPointer: (slot: number) => number;
  getAccumulatorStackSlotCount: () => number;
  getActiveFeaturesScratchPointer: () => number;
  getFeatureWeightsPointer: () => number;
  getFeatureBiasPointer: () => number;
  getFc0BiasPointer: () => number;
  getFc0WeightPointer: () => number;
  getFc1BiasPointer: () => number;
  getFc1WeightPointer: () => number;
  getFc2BiasPointer: () => number;
  getFc2WeightPointer: () => number;
  forward: (
    layerStackIndex: number,
    sideToMove: number,
    whiteSlot: number,
    blackSlot: number,
  ) => number;
  applyFeature: (
    slot: number,
    feature: number,
    direction: number,
  ) => void;
  refreshAccumulator: (
    slot: number,
    activeFeaturesPtr: number,
    featureCount: number,
  ) => void;
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

export type NnueWasmNetworkForward = NnueNetworkForward & {
  readonly accumulatorBackend: NnueAccumulatorBackend;
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
): NnueWasmNetworkForward => {
  const instance = new webAssembly.Instance(getWasmModule());
  const exports = instance.exports as unknown as NnueWasmExports;
  const { memory } = exports;

  copyLayerStackWeights(model, memory, exports);

  const featureWeights = new Int16Array(
    memory.buffer,
    exports.getFeatureWeightsPointer(),
    NNUE_HALF_KA_FEATURE_DIMENSIONS * NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
  );
  featureWeights.set(model.weights.featureWeights);

  const featureBias = new Int16Array(
    memory.buffer,
    exports.getFeatureBiasPointer(),
    NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
  );
  featureBias.set(model.weights.featureBias);

  const activeFeaturesScratch = new Int32Array(
    memory.buffer,
    exports.getActiveFeaturesScratchPointer(),
    NNUE_MAX_ACTIVE_HALF_KA_FEATURES,
  );
  const activeFeaturesScratchPtr = exports.getActiveFeaturesScratchPointer();

  const accumulatorBackend = createWasmAccumulatorBackend(
    exports.applyFeature,
    exports.refreshAccumulator,
    activeFeaturesScratch,
    activeFeaturesScratchPtr,
    memory.buffer,
    exports.getAccumulatorPointer(0),
    exports.getAccumulatorStackSlotCount(),
  );

  const forwardWhiteSlot = accumulatorBackend.accumulatorSlotCount;
  const forwardBlackSlot = forwardWhiteSlot + 1;
  const forwardWhiteAccumulator = new Int32Array(
    memory.buffer,
    exports.getAccumulatorPointer(forwardWhiteSlot),
    NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
  );
  const forwardBlackAccumulator = new Int32Array(
    memory.buffer,
    exports.getAccumulatorPointer(forwardBlackSlot),
    NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
  );

  return {
    accumulatorBackend,
    forward: (white, black, sideToMove, layerStackIndex): number => {
      const whiteSlot = getWasmAccumulatorSlot(accumulatorBackend, white);
      const blackSlot = getWasmAccumulatorSlot(accumulatorBackend, black);

      if (whiteSlot !== null && blackSlot !== null) {
        return exports.forward(
          layerStackIndex,
          sideToMove,
          whiteSlot,
          blackSlot,
        );
      }

      forwardWhiteAccumulator.set(white);
      forwardBlackAccumulator.set(black);

      return exports.forward(
        layerStackIndex,
        sideToMove,
        forwardWhiteSlot,
        forwardBlackSlot,
      );
    },
  };
};
