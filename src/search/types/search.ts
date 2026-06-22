import { AttackInfo } from "../../engine/types/attackInfo";
import { DetermineGameStateRValue } from "../../engine/types/gameState";
import { Undo } from "../../engine/types/history";
import { MoveGenerationContext, MoveList } from "../../engine/types/move";
import { Position } from "../../engine/types/position";
import type { MoveOrderingScratch } from "../helpers/moveOrdering";
import type { KillerMoves } from "./killerMoves";
import type { NullMoveUndo } from "./nullMove";
import type { SearchEvaluator } from "./nnue";

export type SearchResult = {
  bestMove: number | null;
  score: number;
  pv: number[];
};

export type IterativeDeepeningSearchResult = SearchResult & {
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
};

export type SearchLimits = {
  maxNodes?: number;
  maxTimeMs?: number;
  stopSignal?: Int32Array<SharedArrayBuffer>;
  strengthElo?: number;
  minStrengthElo?: number;
  maxStrengthElo?: number;
};

export type SearchControl = {
  limits: SearchLimits;
  evaluator: SearchEvaluator;
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
  selDepth: number;
  startTime: number;
  stopped: boolean;
};

export type SearchScratch = {
  moveLists: MoveList[];
  contexts: MoveGenerationContext[];
  attackInfos: AttackInfo[];
  undoStack: Undo[];
  nullMoveUndoStack: NullMoveUndo[];
  gameStateScratch: DetermineGameStateRValue;
  pvTable: Uint32Array[];
  pvLength: Uint16Array;
  currentMoves: Uint32Array;
  hasCurrentMove: Uint8Array;
  moveOrderingScratches: MoveOrderingScratch[];
  killerMoves: KillerMoves;
};

export type SearchState = {
  position: Position;
  repetitionCounts: Map<bigint, number>;
};
