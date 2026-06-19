import type { ColorType } from "../../engine/types/color";
import type { Position } from "../../engine/types/position";
import {
  NNUE_PSQ_BUCKETS,
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
} from "../constants/nnue";
import type { NnueWeights } from "../types/nnue";
import { appendHalfKaActiveFeatures, makeHalfKaFeatureIndex } from "./features";
import { appendFullThreatActiveFeatures } from "./fullThreats";

const applyHalfKaFeature = (
  weights: NnueWeights,
  feature: number,
  accumulator: Int32Array,
  psqtAccumulator: Int32Array,
  direction: 1 | -1,
): void => {
  let weightIndex = feature * NNUE_TRANSFORMED_FEATURE_DIMENSIONS;

  for (let i = 0; i < NNUE_TRANSFORMED_FEATURE_DIMENSIONS; i++) {
    accumulator[i] += direction * weights.featureWeights[weightIndex++];
  }

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
): void => {
  applyHalfKaFeature(
    weights,
    makeHalfKaFeatureIndex(perspective, square, pieceColor, piece, kingSquare),
    accumulator,
    psqtAccumulator,
    1,
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
): void => {
  applyHalfKaFeature(
    weights,
    makeHalfKaFeatureIndex(perspective, square, pieceColor, piece, kingSquare),
    accumulator,
    psqtAccumulator,
    -1,
  );
};

export const refreshHalfKaAccumulator = (
  weights: NnueWeights,
  position: Position,
  perspective: ColorType,
  activeFeatures: Uint32Array,
  accumulator: Int32Array,
  psqtAccumulator: Int32Array,
): void => {
  const activeFeatureCount = appendHalfKaActiveFeatures(
    position,
    perspective,
    activeFeatures,
    0,
  );

  accumulator.set(weights.featureBias);
  psqtAccumulator.fill(0);

  for (let i = 0; i < activeFeatureCount; i++) {
    applyHalfKaFeature(
      weights,
      activeFeatures[i],
      accumulator,
      psqtAccumulator,
      1,
    );
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
