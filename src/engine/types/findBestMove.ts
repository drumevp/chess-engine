import { Move } from "./move";

export type ChessEngineEvaluator = "simple" | "nnue";

export type FindBestMoveOptions = {
  depth?: number;
  moveTimeMs?: number;
  nodes?: number;
  threads?: number;
  evaluator?: ChessEngineEvaluator;
  nnueModelPath?: string;
  nnueModelUrl?: string;
};

export type FindBestMoveResult = {
  move: number | null;
  moveDecoded: Move | null;
  uci: string | null;
  score: number;
  pv: number[];
  pvUci: string[];
  depth: number;
  selDepth: number;
  nodes: number;
  qNodes: number;
  qDeltaPrunes: number;
  betaCutoffs: number;
  firstMoveBetaCutoffs: number;
  betaCutoffMoveIndexSum: number;
  nullMoveCutoffs: number;
  reverseFutilityPrunes: number;
  probCutCutoffs: number;
  singularExtensions: number;
  hashfull: number;
  elapsedTimeMs: number;
  stopped: boolean;
  threads: number;
};
