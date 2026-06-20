import type { ChessEngineEvaluator } from "../types/findBestMove";

export const DEFAULT_FIND_BEST_MOVE_DEPTH = 4;
export const MAX_FIND_BEST_MOVE_DEPTH = 64;
export const DEFAULT_FIND_BEST_MOVE_THREADS = 1;
export const DEFAULT_FIND_BEST_MOVE_EVALUATOR: ChessEngineEvaluator = "nnue";
