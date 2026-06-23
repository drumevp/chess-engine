import type { Position } from "../../engine/types/position";
import type { Undo } from "../../engine/types/history";
import type { Bitboard32 } from "../../engine/types/bitboard";

export type SearchEvaluator = {
  evaluate: (position: Position) => number;
  reset?: (position: Position) => void;
  pushMove?: (position: Position, move: number, undo: Undo) => void;
  popMove?: () => void;
  pushNullMove?: (position: Position, previousHash: bigint) => void;
  popNullMove?: () => void;
};

export type NnueModelMetadata = {
  id: string;
  architecture: string;
  createdAt: string;
  source: string;
  estimatedElo: number | null;
  trainingGames: number;
  trainingPositions: number;
  fullThreats?: boolean;
  network?: boolean;
};

export type NnueForwardTrace = {
  score: number;
  layerStackIndex: number;
  fc1Activation: Uint8Array;
};

export type NnueArchitecture = {
  halfKaFeatureDimensions: number;
  fullThreatsFeatureDimensions: number;
  transformedFeatureDimensions: number;
  featureVectorDimensions: number;
  fc0Outputs: number;
  fc0OutputsWithBucket: number;
  fc0ActivationInputs: number;
  fc1Outputs: number;
  psqBuckets: number;
  layerStacks: number;
};

export type NnueNetworkWeights = {
  fc0Bias: Int32Array;
  fc0Weights: Int8Array;
  fc1Bias: Int32Array;
  fc1Weights: Int8Array;
  fc2Bias: Int32Array;
  fc2Weights: Int8Array;
};

export type NnueWeights = {
  featureBias: Int16Array;
  featureWeights: Int16Array;
  threatWeights: Int8Array;
  psqtWeights: Int32Array;
  threatPsqtWeights: Int32Array;
  layerStacks: NnueNetworkWeights[];
};

export type NnueModel = {
  metadata: NnueModelMetadata;
  architecture: NnueArchitecture;
  weights: NnueWeights;
};

export type NnueAccumulatorBackend = {
  readonly memory: ArrayBuffer;
  readonly accumulatorBase: number;
  readonly accumulatorSlotByteSize: number;
  readonly accumulatorSlotCount: number;
  readonly activeFeaturesScratch: Int32Array;
  readonly activeFeaturesScratchPointer: number;
  readonly applyFeature: (
    slot: number,
    feature: number,
    direction: 1 | -1,
  ) => void;
  readonly refreshAccumulator: (
    slot: number,
    activeFeaturesPointer: number,
    featureCount: number,
  ) => void;
};

export type NnueAccumulatorStack = {
  currentPly: number;
  accumulatorBackend?: NnueAccumulatorBackend;
  whiteAccumulators: Int32Array[];
  blackAccumulators: Int32Array[];
  whitePsqtAccumulators: Int32Array[];
  blackPsqtAccumulators: Int32Array[];
};

export type NnueScratch = {
  activeFeatures: Uint32Array;
  fullThreatActiveFeatures: Uint32Array;
  fullThreatAttackScratch: Bitboard32;
  whiteAccumulator: Int32Array;
  blackAccumulator: Int32Array;
  whitePsqtAccumulator: Int32Array;
  blackPsqtAccumulator: Int32Array;
  transformedFeatures: Uint8Array;
  fc0Output: Int32Array;
  fc0Sums: Int32Array;
  fc0Activation: Uint8Array;
  fc1Output: Int32Array;
  fc1Sums: Int32Array;
  fc1Activation: Uint8Array;
};

export type SerializedNnueModel = {
  metadata: NnueModelMetadata;
  seed: number;
};
