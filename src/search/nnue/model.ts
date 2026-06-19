import {
  NNUE_DEFAULT_RANDOM_SEED,
  NNUE_FC_0_OUTPUTS_WITH_BUCKET,
  NNUE_FC_1_OUTPUTS,
  NNUE_FC_0_WEIGHT_COUNT,
  NNUE_FC_1_WEIGHT_COUNT,
  NNUE_FC_2_WEIGHT_COUNT,
  NNUE_FULL_THREAT_PSQ_WEIGHT_COUNT,
  NNUE_FULL_THREAT_WEIGHT_COUNT,
  NNUE_HALF_KA_PSQ_WEIGHT_COUNT,
  NNUE_HALF_KA_WEIGHT_COUNT,
  NNUE_LAYER_STACKS,
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
} from "../constants/nnue";
import type {
  NnueModel,
  NnueModelMetadata,
  NnueNetworkWeights,
  NnueWeights,
} from "../types/nnue";
import { NNUE_ARCHITECTURE } from "./architecture";
import { createSeededRandom, getRandomInt } from "./random";

const fillRandomInt8 = (
  values: Int8Array,
  random: () => number,
  min: number,
  max: number,
): void => {
  for (let i = 0; i < values.length; i++) {
    values[i] = getRandomInt(random, min, max);
  }
};

const fillRandomInt16 = (
  values: Int16Array,
  random: () => number,
  min: number,
  max: number,
): void => {
  for (let i = 0; i < values.length; i++) {
    values[i] = getRandomInt(random, min, max);
  }
};

const fillRandomInt32 = (
  values: Int32Array,
  random: () => number,
  min: number,
  max: number,
): void => {
  for (let i = 0; i < values.length; i++) {
    values[i] = getRandomInt(random, min, max);
  }
};

export const createEmptyNnueNetworkWeights = (): NnueNetworkWeights => ({
  fc0Bias: new Int32Array(NNUE_FC_0_OUTPUTS_WITH_BUCKET),
  fc0Weights: new Int8Array(NNUE_FC_0_WEIGHT_COUNT),
  fc1Bias: new Int32Array(NNUE_FC_1_OUTPUTS),
  fc1Weights: new Int8Array(NNUE_FC_1_WEIGHT_COUNT),
  fc2Bias: new Int32Array(1),
  fc2Weights: new Int8Array(NNUE_FC_2_WEIGHT_COUNT),
});

export const createEmptyNnueWeights = (): NnueWeights => ({
  featureBias: new Int16Array(NNUE_TRANSFORMED_FEATURE_DIMENSIONS),
  featureWeights: new Int16Array(NNUE_HALF_KA_WEIGHT_COUNT),
  threatWeights: new Int8Array(NNUE_FULL_THREAT_WEIGHT_COUNT),
  psqtWeights: new Int32Array(NNUE_HALF_KA_PSQ_WEIGHT_COUNT),
  threatPsqtWeights: new Int32Array(NNUE_FULL_THREAT_PSQ_WEIGHT_COUNT),
  layerStacks: Array.from({ length: NNUE_LAYER_STACKS }, () =>
    createEmptyNnueNetworkWeights(),
  ),
});

export const createRandomNnueWeights = (
  seed = NNUE_DEFAULT_RANDOM_SEED,
): NnueWeights => {
  const random = createSeededRandom(seed);
  const weights = createEmptyNnueWeights();

  fillRandomInt16(weights.featureBias, random, -4, 4);
  fillRandomInt16(weights.featureWeights, random, -2, 2);
  fillRandomInt8(weights.threatWeights, random, -2, 2);
  fillRandomInt32(weights.psqtWeights, random, -16, 16);
  fillRandomInt32(weights.threatPsqtWeights, random, -16, 16);

  for (const layerStack of weights.layerStacks) {
    fillRandomInt8(layerStack.fc0Weights, random, -2, 2);
    fillRandomInt8(layerStack.fc1Weights, random, -4, 4);
    fillRandomInt8(layerStack.fc2Weights, random, -4, 4);
  }

  return weights;
};

export const createNnueModel = (
  metadata: NnueModelMetadata,
  weights: NnueWeights,
): NnueModel => ({
  metadata,
  architecture: NNUE_ARCHITECTURE,
  weights,
});

export const createRandomNnueModel = (
  metadata: NnueModelMetadata,
  seed = NNUE_DEFAULT_RANDOM_SEED,
): NnueModel => createNnueModel(metadata, createRandomNnueWeights(seed));
