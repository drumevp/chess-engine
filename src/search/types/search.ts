import { AttackInfo } from "../../engine/types/attackInfo";
import { DetermineGameStateRValue } from "../../engine/types/gameState";
import { Undo } from "../../engine/types/history";
import { MoveGenerationContext, MoveList } from "../../engine/types/move";
import { Position } from "../../engine/types/position";

export type SearchResult = {
  bestMove: number | null;
  score: number;
};

export type IterativeDeepeningSearchResult = SearchResult & {
  depth: number;
};

export type SearchScratch = {
  moveLists: MoveList[];
  contexts: MoveGenerationContext[];
  attackInfos: AttackInfo[];
  undoStack: Undo[];
  gameStateScratch: DetermineGameStateRValue;
};

export type SearchState = {
  position: Position;
  repetitionCounts: Map<bigint, number>;
};
