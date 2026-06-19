import {
  NNUE_FC_0_ACTIVATION_INPUTS,
  NNUE_FC_0_OUTPUTS_WITH_BUCKET,
  NNUE_FC_1_OUTPUTS,
  NNUE_FEATURE_VECTOR_DIMENSIONS,
  NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES,
  NNUE_MAX_ACTIVE_HALF_KA_FEATURES,
  NNUE_PSQ_BUCKETS,
  NNUE_TRANSFORMED_FEATURE_DIMENSIONS,
} from "../constants/nnue";
import type { NnueScratch } from "../types/nnue";

export const createNnueScratch = (): NnueScratch => ({
  activeFeatures: new Uint32Array(NNUE_MAX_ACTIVE_HALF_KA_FEATURES),
  fullThreatActiveFeatures: new Uint32Array(
    NNUE_MAX_ACTIVE_FULL_THREAT_FEATURES,
  ),
  fullThreatAttackScratch: { lo: 0, hi: 0 },
  whiteAccumulator: new Int16Array(NNUE_TRANSFORMED_FEATURE_DIMENSIONS),
  blackAccumulator: new Int16Array(NNUE_TRANSFORMED_FEATURE_DIMENSIONS),
  whitePsqtAccumulator: new Int32Array(NNUE_PSQ_BUCKETS),
  blackPsqtAccumulator: new Int32Array(NNUE_PSQ_BUCKETS),
  transformedFeatures: new Uint8Array(NNUE_FEATURE_VECTOR_DIMENSIONS),
  fc0Output: new Int32Array(NNUE_FC_0_OUTPUTS_WITH_BUCKET),
  fc0Activation: new Uint8Array(NNUE_FC_0_ACTIVATION_INPUTS),
  fc1Output: new Int32Array(NNUE_FC_1_OUTPUTS),
  fc1Activation: new Uint8Array(NNUE_FC_1_OUTPUTS),
});
