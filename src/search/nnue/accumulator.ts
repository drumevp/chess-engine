import type { ColorType } from "../../engine/types/color";
import type { Position } from "../../engine/types/position";
import {
  NNUE_PSQ_BUCKETS,
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
} from "../constants/nnue";
import type {
  NnueAccumulatorBackend,
  NnueWeights,
} from "../types/nnue";
import { appendHalfKaActiveFeatures, makeHalfKaFeatureIndex } from "./features";
import { appendFullThreatActiveFeatures } from "./fullThreats";

const applyHalfKaAccumulatorFeature = (
  weights: NnueWeights,
  feature: number,
  accumulator: Int32Array,
  direction: 1 | -1,
  slot: number,
  accumulatorBackend?: NnueAccumulatorBackend,
): void => {
  if (accumulatorBackend !== undefined && slot >= 0) {
    accumulatorBackend.applyFeature(slot, feature, direction);

    return;
  }

  let weightIndex = feature * NNUE_TRANSFORMED_FEATURE_DIMENSIONS;

  for (let i = 0; i < NNUE_TRANSFORMED_FEATURE_DIMENSIONS; i++) {
    accumulator[i] += direction * weights.featureWeights[weightIndex++];
  }
};

const applyHalfKaFeature = (
  weights: NnueWeights,
  feature: number,
  accumulator: Int32Array,
  psqtAccumulator: Int32Array,
  direction: 1 | -1,
  slot: number = -1,
  accumulatorBackend?: NnueAccumulatorBackend,
): void => {
  applyHalfKaAccumulatorFeature(
    weights,
    feature,
    accumulator,
    direction,
    slot,
    accumulatorBackend,
  );

  let psqtWeightIndex = feature * NNUE_PSQ_BUCKETS;

  for (let i = 0; i < NNUE_PSQ_BUCKETS; i++) {
    psqtAccumulator[i] += direction * weights.psqtWeights[psqtWeightIndex++];
  }
};

export const addHalfKaFeature = (
  weights: NnueWeights,
  perspective: ColorType,
  square: number,
  pieceColor: ColorType,
  piece: number,
  kingSquare: number,
  accumulator: Int32Array,
  psqtAccumulator: Int32Array,
  slot: number = -1,
  accumulatorBackend?: NnueAccumulatorBackend,
): void => {
  applyHalfKaFeature(
    weights,
    makeHalfKaFeatureIndex(perspective, square, pieceColor, piece, kingSquare),
    accumulator,
    psqtAccumulator,
    1,
    slot,
    accumulatorBackend,
  );
};

export const removeHalfKaFeature = (
  weights: NnueWeights,
  perspective: ColorType,
  square: number,
  pieceColor: ColorType,
  piece: number,
  kingSquare: number,
  accumulator: Int32Array,
  psqtAccumulator: Int32Array,
  slot: number = -1,
  accumulatorBackend?: NnueAccumulatorBackend,
): void => {
  applyHalfKaFeature(
    weights,
    makeHalfKaFeatureIndex(perspective, square, pieceColor, piece, kingSquare),
    accumulator,
    psqtAccumulator,
    -1,
    slot,
    accumulatorBackend,
  );
};

export const refreshHalfKaAccumulator = (
  weights: NnueWeights,
  position: Position,
  perspective: ColorType,
  activeFeatures: Uint32Array,
  accumulator: Int32Array,
  psqtAccumulator: Int32Array,
  slot: number = -1,
  accumulatorBackend?: NnueAccumulatorBackend,
): void => {
  const activeFeatureCount = appendHalfKaActiveFeatures(
    position,
    perspective,
    activeFeatures,
    0,
  );

  if (accumulatorBackend !== undefined && slot >= 0) {
    accumulatorBackend.activeFeaturesScratch.set(
      activeFeatures.subarray(0, activeFeatureCount),
    );
    accumulatorBackend.refreshAccumulator(
      slot,
      accumulatorBackend.activeFeaturesScratchPointer,
      activeFeatureCount,
    );
  } else {
    accumulator.set(weights.featureBias);

    for (let i = 0; i < activeFeatureCount; i++) {
      applyHalfKaAccumulatorFeature(
        weights,
        activeFeatures[i],
        accumulator,
        1,
        -1,
      );
    }
  }

  psqtAccumulator.fill(0);

  for (let i = 0; i < activeFeatureCount; i++) {
    const feature = activeFeatures[i];
    let psqtWeightIndex = feature * NNUE_PSQ_BUCKETS;

    for (let j = 0; j < NNUE_PSQ_BUCKETS; j++) {
      psqtAccumulator[j] += weights.psqtWeights[psqtWeightIndex++];
    }
  }
};

export const addFullThreatAccumulator = (
  weights: NnueWeights,
  position: Position,
  perspective: ColorType,
  activeFeatures: Uint32Array,
  attackScratch: { lo: number; hi: number },
  accumulator: Int32Array,
  psqtAccumulator: Int32Array,
): void => {
  const activeFeatureCount = appendFullThreatActiveFeatures(
    position,
    perspective,
    activeFeatures,
    0,
    attackScratch,
  );

  for (let i = 0; i < activeFeatureCount; i++) {
    const feature = activeFeatures[i];
    let weightIndex = feature * NNUE_TRANSFORMED_FEATURE_DIMENSIONS;

    for (let j = 0; j < NNUE_TRANSFORMED_FEATURE_DIMENSIONS; j++) {
      accumulator[j] += weights.threatWeights[weightIndex++];
    }

    let psqtWeightIndex = feature * NNUE_PSQ_BUCKETS;

    for (let j = 0; j < NNUE_PSQ_BUCKETS; j++) {
      psqtAccumulator[j] += weights.threatPsqtWeights[psqtWeightIndex++];
    }
  }
};
