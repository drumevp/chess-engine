import {
  NNUE_FC_0_ACTIVATION_INPUTS,
  NNUE_FC_0_OUTPUTS_WITH_BUCKET,
  NNUE_FC_1_OUTPUTS,
  NNUE_FEATURE_VECTOR_DIMENSIONS,
  NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES,
  NNUE_MAX_ACTIVE_HALF_KA_FEATURES,
  NNUE_PSQ_BUCKETS,
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
} from "../../src/search/constants/nnue";
import type { Bitboard32 } from "../../src/engine/types/bitboard";

export type NnueTrainingScratch = {
  whiteHalfKaFeatures: Uint32Array;
  blackHalfKaFeatures: Uint32Array;
  whiteFullThreatFeatures: Uint32Array;
  blackFullThreatFeatures: Uint32Array;
  fullThreatAttackScratch: Bitboard32;
  whiteAccumulator: Float32Array;
  blackAccumulator: Float32Array;
  whitePsqtAccumulator: Float32Array;
  blackPsqtAccumulator: Float32Array;
  transformedFeatures: Float32Array;
  fc0Output: Float32Array;
  fc0Activation: Float32Array;
  fc1Output: Float32Array;
  fc1Activation: Float32Array;
  gradTransformedFeatures: Float32Array;
  gradFc0Output: Float32Array;
  gradFc0Activation: Float32Array;
  gradFc1Output: Float32Array;
  gradFc1Activation: Float32Array;
  gradWhiteAccumulator: Float32Array;
  gradBlackAccumulator: Float32Array;
};

export const createNnueTrainingScratch = (): NnueTrainingScratch => ({
  whiteHalfKaFeatures: new Uint32Array(NNUE_MAX_ACTIVE_HALF_KA_FEATURES),
  blackHalfKaFeatures: new Uint32Array(NNUE_MAX_ACTIVE_HALF_KA_FEATURES),
  whiteFullThreatFeatures: new Uint32Array(
    NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES,
  ),
  blackFullThreatFeatures: new Uint32Array(
    NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES,
  ),
  fullThreatAttackScratch: { lo: 0, hi: 0 },
  whiteAccumulator: new Float32Array(NNUE_TRANSFORMED_FEATURE_DIMENSIONS),
  blackAccumulator: new Float32Array(NNUE_TRANSFORMED_FEATURE_DIMENSIONS),
  whitePsqtAccumulator: new Float32Array(NNUE_PSQ_BUCKETS),
  blackPsqtAccumulator: new Float32Array(NNUE_PSQ_BUCKETS),
  transformedFeatures: new Float32Array(NNUE_FEATURE_VECTOR_DIMENSIONS),
  fc0Output: new Float32Array(NNUE_FC_0_OUTPUTS_WITH_BUCKET),
  fc0Activation: new Float32Array(NNUE_FC_0_ACTIVATION_INPUTS),
  fc1Output: new Float32Array(NNUE_FC_1_OUTPUTS),
  fc1Activation: new Float32Array(NNUE_FC_1_OUTPUTS),
  gradTransformedFeatures: new Float32Array(NNUE_FEATURE_VECTOR_DIMENSIONS),
  gradFc0Output: new Float32Array(NNUE_FC_0_OUTPUTS_WITH_BUCKET),
  gradFc0Activation: new Float32Array(NNUE_FC_0_ACTIVATION_INPUTS),
  gradFc1Output: new Float32Array(NNUE_FC_1_OUTPUTS),
  gradFc1Activation: new Float32Array(NNUE_FC_1_OUTPUTS),
  gradWhiteAccumulator: new Float32Array(NNUE_TRANSFORMED_FEATURE_DIMENSIONS),
  gradBlackAccumulator: new Float32Array(NNUE_TRANSFORMED_FEATURE_DIMENSIONS),
});
