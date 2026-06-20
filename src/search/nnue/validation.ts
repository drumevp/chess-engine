import {
  NNUE_ARCHITECTURE_NAME,
  NNUE_FC_0_OUTPUTS_WITH_BUCKET,
  NNUE_FC_0_WEIGHT_COUNT,
  NNUE_FC_1_OUTPUTS,
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

const assertValidString = (value: string, label: string): void => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid NNUE model: ${label} must be a non-empty string`);
  }
};

const assertLength = (
  actual: number,
  expected: number,
  label: string,
): void => {
  if (actual !== expected) {
    throw new Error(
      `Invalid NNUE model: ${label} length ${actual} !== ${expected}`,
    );
  }
};

const validateNnueModelMetadata = (metadata: NnueModelMetadata): void => {
  assertValidString(metadata.id, "metadata.id");
  assertValidString(metadata.architecture, "metadata.architecture");
  assertValidString(metadata.createdAt, "metadata.createdAt");
  assertValidString(metadata.source, "metadata.source");

  if (metadata.architecture !== NNUE_ARCHITECTURE_NAME) {
    throw new Error(
      `Invalid NNUE model: architecture ${metadata.architecture} !== ${NNUE_ARCHITECTURE_NAME}`,
    );
  }

  if (
    metadata.estimatedElo !== null &&
    (!Number.isFinite(metadata.estimatedElo) || metadata.estimatedElo <= 0)
  ) {
    throw new Error("Invalid NNUE model: metadata.estimatedElo is invalid");
  }

  if (
    !Number.isInteger(metadata.trainingGames) ||
    metadata.trainingGames < 0
  ) {
    throw new Error("Invalid NNUE model: metadata.trainingGames is invalid");
  }

  if (
    !Number.isInteger(metadata.trainingPositions) ||
    metadata.trainingPositions < 0
  ) {
    throw new Error("Invalid NNUE model: metadata.trainingPositions is invalid");
  }

  if (
    metadata.fullThreats !== undefined &&
    typeof metadata.fullThreats !== "boolean"
  ) {
    throw new Error("Invalid NNUE model: metadata.fullThreats is invalid");
  }

  if (
    metadata.network !== undefined &&
    typeof metadata.network !== "boolean"
  ) {
    throw new Error("Invalid NNUE model: metadata.network is invalid");
  }
};

const validateNnueNetworkWeights = (
  weights: NnueNetworkWeights,
  index: number,
): void => {
  assertLength(
    weights.fc0Bias.length,
    NNUE_FC_0_OUTPUTS_WITH_BUCKET,
    `layerStacks[${index}].fc0Bias`,
  );
  assertLength(
    weights.fc0Weights.length,
    NNUE_FC_0_WEIGHT_COUNT,
    `layerStacks[${index}].fc0Weights`,
  );
  assertLength(
    weights.fc1Bias.length,
    NNUE_FC_1_OUTPUTS,
    `layerStacks[${index}].fc1Bias`,
  );
  assertLength(
    weights.fc1Weights.length,
    NNUE_FC_1_WEIGHT_COUNT,
    `layerStacks[${index}].fc1Weights`,
  );
  assertLength(weights.fc2Bias.length, 1, `layerStacks[${index}].fc2Bias`);
  assertLength(
    weights.fc2Weights.length,
    NNUE_FC_2_WEIGHT_COUNT,
    `layerStacks[${index}].fc2Weights`,
  );
};

export const validateNnueWeights = (weights: NnueWeights): void => {
  assertLength(
    weights.featureBias.length,
    NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
    "featureBias",
  );
  assertLength(
    weights.featureWeights.length,
    NNUE_HALF_KA_WEIGHT_COUNT,
    "featureWeights",
  );
  assertLength(
    weights.threatWeights.length,
    NNUE_FULL_THREAT_WEIGHT_COUNT,
    "threatWeights",
  );
  assertLength(
    weights.psqtWeights.length,
    NNUE_HALF_KA_PSQ_WEIGHT_COUNT,
    "psqtWeights",
  );
  assertLength(
    weights.threatPsqtWeights.length,
    NNUE_FULL_THREAT_PSQ_WEIGHT_COUNT,
    "threatPsqtWeights",
  );
  assertLength(weights.layerStacks.length, NNUE_LAYER_STACKS, "layerStacks");

  for (let i = 0; i < weights.layerStacks.length; i++) {
    validateNnueNetworkWeights(weights.layerStacks[i], i);
  }
};

export const validateNnueModel = (model: NnueModel): void => {
  validateNnueModelMetadata(model.metadata);

  if (model.architecture !== NNUE_ARCHITECTURE) {
    throw new Error("Invalid NNUE model: architecture object is not current");
  }

  validateNnueWeights(model.weights);
};
