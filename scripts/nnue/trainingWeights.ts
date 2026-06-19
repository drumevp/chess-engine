import {
  NNUE_FC_0_WEIGHT_COUNT,
  NNUE_FC_1_WEIGHT_COUNT,
  NNUE_FC_2_WEIGHT_COUNT,
  NNUE_FULL_THREAT_PSQ_WEIGHT_COUNT,
  NNUE_FULL_THREAT_WEIGHT_COUNT,
  NNUE_HALF_KA_PSQ_WEIGHT_COUNT,
  NNUE_HALF_KA_WEIGHT_COUNT,
  NNUE_LAYER_STACKS,
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
  NNUE_FC_0_OUTPUTS_WITH_BUCKET,
  NNUE_FC_1_OUTPUTS,
} from "../../src/search/constants/nnue";
import type {
  NnueModel,
  NnueNetworkWeights,
  NnueWeights,
} from "../../src/search/types/nnue";
import { createEmptyNnueWeights } from "../../src/search/nnue/model";

export type TrainableNnueNetworkWeights = {
  fc0Bias: Float32Array;
  fc0Weights: Float32Array;
  fc1Bias: Float32Array;
  fc1Weights: Float32Array;
  fc2Bias: Float32Array;
  fc2Weights: Float32Array;
};

export type TrainableNnueWeights = {
  featureBias: Float32Array;
  featureWeights: Float32Array;
  threatWeights: Float32Array;
  psqtWeights: Float32Array;
  threatPsqtWeights: Float32Array;
  layerStacks: TrainableNnueNetworkWeights[];
};

const copyToFloat32 = (
  source: Int8Array | Int16Array | Int32Array,
): Float32Array => Float32Array.from(source);

const createTrainableLayerStack = (
  source: NnueNetworkWeights,
): TrainableNnueNetworkWeights => ({
  fc0Bias: copyToFloat32(source.fc0Bias),
  fc0Weights: copyToFloat32(source.fc0Weights),
  fc1Bias: copyToFloat32(source.fc1Bias),
  fc1Weights: copyToFloat32(source.fc1Weights),
  fc2Bias: copyToFloat32(source.fc2Bias),
  fc2Weights: copyToFloat32(source.fc2Weights),
});

export const createTrainableNnueWeights = (
  model: NnueModel,
): TrainableNnueWeights => ({
  featureBias: copyToFloat32(model.weights.featureBias),
  featureWeights: copyToFloat32(model.weights.featureWeights),
  threatWeights: copyToFloat32(model.weights.threatWeights),
  psqtWeights: copyToFloat32(model.weights.psqtWeights),
  threatPsqtWeights: copyToFloat32(model.weights.threatPsqtWeights),
  layerStacks: model.weights.layerStacks.map(createTrainableLayerStack),
});

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
};

export const applyGradient = (
  value: number,
  gradient: number,
  learningRate: number,
  min: number,
  max: number,
): number => {
  if (!Number.isFinite(value)) {
    throw new Error(`Non-finite NNUE weight value: ${value}`);
  }

  if (!Number.isFinite(gradient)) {
    throw new Error(`Non-finite NNUE gradient: ${gradient}`);
  }

  if (!Number.isFinite(learningRate)) {
    throw new Error(`Non-finite NNUE learning rate: ${learningRate}`);
  }

  const next = value - learningRate * gradient;

  if (!Number.isFinite(next)) {
    throw new Error(
      `Non-finite NNUE weight update: value=${value}, gradient=${gradient}, learningRate=${learningRate}`,
    );
  }

  return clamp(next, min, max);
};

export const fakeQuantizeWeight = (
  value: number,
  min: number,
  max: number,
): number => Math.round(clamp(value, min, max));

const quantizeArray = (
  source: Float32Array,
  target: Int8Array | Int16Array | Int32Array,
  min: number,
  max: number,
): void => {
  for (let i = 0; i < source.length; i++) {
    target[i] = Math.round(clamp(source[i], min, max));
  }
};

const quantizeLayerStack = (
  source: TrainableNnueNetworkWeights,
  target: NnueNetworkWeights,
): void => {
  quantizeArray(source.fc0Bias, target.fc0Bias, -2_147_483_648, 2_147_483_647);
  quantizeArray(source.fc0Weights, target.fc0Weights, -127, 127);
  quantizeArray(source.fc1Bias, target.fc1Bias, -2_147_483_648, 2_147_483_647);
  quantizeArray(source.fc1Weights, target.fc1Weights, -127, 127);
  quantizeArray(source.fc2Bias, target.fc2Bias, -2_147_483_648, 2_147_483_647);
  quantizeArray(source.fc2Weights, target.fc2Weights, -127, 127);
};

export const quantizeTrainableNnueWeights = (
  source: TrainableNnueWeights,
): NnueWeights => {
  const target = createEmptyNnueWeights();

  quantizeArray(source.featureBias, target.featureBias, -32_768, 32_767);
  quantizeArray(source.featureWeights, target.featureWeights, -32_768, 32_767);
  quantizeArray(source.threatWeights, target.threatWeights, -127, 127);
  quantizeArray(source.psqtWeights, target.psqtWeights, -2_147_483_648, 2_147_483_647);
  quantizeArray(
    source.threatPsqtWeights,
    target.threatPsqtWeights,
    -2_147_483_648,
    2_147_483_647,
  );

  for (let i = 0; i < NNUE_LAYER_STACKS; i++) {
    quantizeLayerStack(source.layerStacks[i], target.layerStacks[i]);
  }

  return target;
};

export const createEmptyTrainableNnueWeights = (): TrainableNnueWeights => ({
  featureBias: new Float32Array(NNUE_TRANSFORMED_FEATURE_DIMENSIONS),
  featureWeights: new Float32Array(NNUE_HALF_KA_WEIGHT_COUNT),
  threatWeights: new Float32Array(NNUE_FULL_THREAT_WEIGHT_COUNT),
  psqtWeights: new Float32Array(NNUE_HALF_KA_PSQ_WEIGHT_COUNT),
  threatPsqtWeights: new Float32Array(NNUE_FULL_THREAT_PSQ_WEIGHT_COUNT),
  layerStacks: Array.from({ length: NNUE_LAYER_STACKS }, () => ({
    fc0Bias: new Float32Array(NNUE_FC_0_OUTPUTS_WITH_BUCKET),
    fc0Weights: new Float32Array(NNUE_FC_0_WEIGHT_COUNT),
    fc1Bias: new Float32Array(NNUE_FC_1_OUTPUTS),
    fc1Weights: new Float32Array(NNUE_FC_1_WEIGHT_COUNT),
    fc2Bias: new Float32Array(1),
    fc2Weights: new Float32Array(NNUE_FC_2_WEIGHT_COUNT),
  })),
});
