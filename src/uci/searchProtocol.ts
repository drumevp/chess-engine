import type { SerializedRepetitionCount } from "../search/types/lazySmp";
import type {
  IterativeDeepeningSearchResult,
  SearchLimits,
} from "../search/types/search";

export type UciEvaluatorName = "simple" | "nnue";

export type UciSearchRequest = {
  searchId: number;
  fen: string;
  repetitionCounts: SerializedRepetitionCount[];
  maxDepth: number;
  limits: SearchLimits;
  threads: number;
  evaluator: UciEvaluatorName;
  nnueModelPath?: string;
  transpositionTableSize: number;
};

export type UciSearchWorkerCommand =
  | { type: "search"; request: UciSearchRequest }
  | { type: "clearHash" };

export type UciSearchWorkerMessage =
  | {
      type: "iteration";
      searchId: number;
      result: IterativeDeepeningSearchResult;
    }
  | {
      type: "result";
      searchId: number;
      result: IterativeDeepeningSearchResult;
    }
  | { type: "error"; searchId: number; message: string };
