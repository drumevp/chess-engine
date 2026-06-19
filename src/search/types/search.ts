import { AttackInfo } from "../../engine/types/attackInfo";
import { DetermineGameStateRValue } from "../../engine/types/gameState";
import { Undo } from "../../engine/types/history";
import { MoveGenerationContext, MoveList } from "../../engine/types/move";
import { Position } from "../../engine/types/position";
import type { MoveOrderingScratch } from "../helpers/moveOrdering";
import type { KillerMoves } from "./killerMoves";

export type SearchResult = {
  bestMove: number | null;
  score: number;
  pv: number[];
};

export type IterativeDeepeningSearchResult = SearchResult & {
  depth: number;
  nodes: number;
  elapsedTimeMs: number;
  stopped: boolean;
};

export type SearchLimits = {
  maxNodes?: number;
  maxTimeMs?: number;
};

export type SearchControl = {
  limits: SearchLimits;
  nodes: number;
  startTime: number;
  stopped: boolean;
};

export type SearchScratch = {
  moveLists: MoveList[];
  contexts: MoveGenerationContext[];
  attackInfos: AttackInfo[];
  undoStack: Undo[];
  gameStateScratch: DetermineGameStateRValue;
  pvTable: Uint32Array[];
  pvLength: Uint16Array;
  moveOrderingScratches: MoveOrderingScratch[];
  killerMoves: KillerMoves;
};

export type SearchState = {
  position: Position;
  repetitionCounts: Map<bigint, number>;
};
