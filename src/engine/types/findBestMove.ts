import { Move } from "./move";

export type ChessEngineEvaluator = "simple" | "nnue";

export type FindBestMoveOptions = {
  depth?: number;
  moveTimeMs?: number;
  nodes?: number;
  threads?: number;
  evaluator?: ChessEngineEvaluator;
  nnueModelPath?: string;
};

export type FindBestMoveResult = {
  move: number | null;
  moveDecoded: Move | null;
  uci: string | null;
  score: number;
  pv: number[];
  pvUci: string[];
  depth: number;
  nodes: number;
  elapsedTimeMs: number;
  stopped: boolean;
  threads: number;
};
