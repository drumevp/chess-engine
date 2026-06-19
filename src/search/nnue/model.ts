import {
  NNUE_DEFAULT_RANDOM_SEED,
  NNUE_FC_0_OUTPUTS_WITH_BUCKET,
  NNUE_FC_1_OUTPUTS,
  NNUE_FC_0_WEIGHT_COUNT,
  NNUE_FC_1_WEIGHT_COUNT,
  NNUE_FC_2_WEIGHT_COUNT,
  NNUE_FULL_THREAT_PSQ_WEIGHT_COUNT,
  NNUE_FULL_THREAT_WEIGHT_COUNT,
  NNUE_HALF_KA_FEATURE_DIMENSIONS,
  NNUE_HALF_KA_PSQ_WEIGHT_COUNT,
  NNUE_HALF_KA_WEIGHT_COUNT,
  NNUE_LAYER_STACKS,
  NNUE_OUTPUT_SCALE,
  NNUE_PIECE_SQUARE_BUCKET_SIZE,
  NNUE_PSQ_BUCKETS,
  NNUE_SQUARE_COUNT,
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
  NNUE_WEIGHT_SCALE_BITS,
} from "../constants/nnue";
import { PIECE_VALUE } from "../constants/eval";
import {
  BISHOP_INDEX,
  KNIGHT_INDEX,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../../engine/constants/piece";
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

const MATERIAL_PIECE_TYPES = [
  PAWN_INDEX,
  PAWN_INDEX,
  KNIGHT_INDEX,
  KNIGHT_INDEX,
  BISHOP_INDEX,
  BISHOP_INDEX,
  ROOK_INDEX,
  ROOK_INDEX,
  QUEEN_INDEX,
  QUEEN_INDEX,
] as const;
const MATERIAL_PSQT_SCALE = (NNUE_OUTPUT_SCALE * 128) / 125;

const initializeMaterialPsqt = (weights: NnueWeights): void => {
  for (let feature = 0; feature < NNUE_HALF_KA_FEATURE_DIMENSIONS; feature++) {
    const pieceOffset = Math.trunc(
      (feature % NNUE_PIECE_SQUARE_BUCKET_SIZE) / NNUE_SQUARE_COUNT,
    );
    const pieceType = MATERIAL_PIECE_TYPES[pieceOffset];

    if (pieceType === undefined) {
      continue;
    }

    const perspectiveSign = pieceOffset % 2 === 0 ? 1 : -1;
    const value = Math.round(
      perspectiveSign * PIECE_VALUE[pieceType] * MATERIAL_PSQT_SCALE,
    );
    const offset = feature * NNUE_PSQ_BUCKETS;

    for (let bucket = 0; bucket < NNUE_PSQ_BUCKETS; bucket++) {
      weights.psqtWeights[offset + bucket] = value;
    }
  }
};

export const createMaterialNnueWeights = (
  seed = NNUE_DEFAULT_RANDOM_SEED,
): NnueWeights => {
  const weights = createRandomNnueWeights(seed);

  weights.featureBias.fill(64);
  weights.threatWeights.fill(0);
  weights.threatPsqtWeights.fill(0);
  initializeMaterialPsqt(weights);

  for (const layerStack of weights.layerStacks) {
    layerStack.fc1Bias.fill(1 << NNUE_WEIGHT_SCALE_BITS);
    layerStack.fc2Bias.fill(0);
    layerStack.fc2Weights.fill(0);
    layerStack.fc0Bias[NNUE_FC_0_OUTPUTS_WITH_BUCKET - 1] = 0;

    for (
      let index = NNUE_FC_0_OUTPUTS_WITH_BUCKET - 1;
      index < layerStack.fc0Weights.length;
      index += NNUE_FC_0_OUTPUTS_WITH_BUCKET
    ) {
      layerStack.fc0Weights[index] = 0;
    }
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

export const createMaterialNnueModel = (
  metadata: NnueModelMetadata,
  seed = NNUE_DEFAULT_RANDOM_SEED,
): NnueModel =>
  createNnueModel(
    { ...metadata, fullThreats: false, network: false },
    createMaterialNnueWeights(seed),
  );
