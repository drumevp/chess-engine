import type { IterativeDeepeningSearchResult, SearchLimits } from "./search";
import type { SharedTranspositionTableBuffers } from "./transpositionTable";

export type LazySmpEvaluatorType = "simple" | "defaultNnue";

export type LazySmpSearchOptions = {
  workerCount?: number;
  depthStagger?: number;
  useRootMovePriorities?: boolean;
  evaluatorType?: LazySmpEvaluatorType;
  transpositionTableSize?: number;
  useSharedTranspositionTable?: boolean;
};

export type SerializedRepetitionCount = readonly [hash: string, count: number];

export type LazySmpWorkerData = {
  workerId: number;
  fen: string;
  repetitionCounts: SerializedRepetitionCount[];
  maxDepth: number;
  limits: SearchLimits;
  priorityMove: number | null;
  evaluatorType: LazySmpEvaluatorType;
  transpositionTable?: SharedTranspositionTableBuffers;
};

export type LazySmpWorkerSearchResult = IterativeDeepeningSearchResult & {
  workerId: number;
  requestedDepth: number;
  priorityMove: number | null;
};

export type LazySmpSearchResult = IterativeDeepeningSearchResult & {
  workerCount: number;
  workerResults: LazySmpWorkerSearchResult[];
};
