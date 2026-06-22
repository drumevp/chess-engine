import type { IterativeDeepeningSearchResult, SearchLimits } from "./search";
import type { SharedTranspositionTableBuffers } from "./transpositionTable";

export type LazySmpEvaluatorType = "simple" | "defaultNnue";

export type LazySmpSearchOptions = {
  workerCount?: number;
  depthStagger?: number;
  useRootMovePriorities?: boolean;
  evaluatorType?: LazySmpEvaluatorType;
  nnueModelPath?: string;
  transpositionTableSize?: number;
  useSharedTranspositionTable?: boolean;
  onIteration?: (result: IterativeDeepeningSearchResult) => void;
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
  nnueModelPath?: string;
  transpositionTable?: SharedTranspositionTableBuffers;
};

export type LazySmpWorkerSearchResult = IterativeDeepeningSearchResult & {
  workerId: number;
  requestedDepth: number;
  priorityMove: number | null;
};

export type LazySmpWorkerMessage =
  | { type: "iteration"; result: LazySmpWorkerSearchResult }
  | { type: "result"; result: LazySmpWorkerSearchResult };

export type LazySmpSearchResult = IterativeDeepeningSearchResult & {
  workerCount: number;
  workerResults: LazySmpWorkerSearchResult[];
};
