import { GAME_STATE } from "../../engine/constants/gameState";
import clonePosition from "../../engine/helpers/clonePosition";
import { createAttackInfo } from "../../engine/movegen/attackInfo/main";
import { createMoveGenerationContext } from "../../engine/movegen/getMoveGenerationContext";
import { createMoveList } from "../../engine/movegen/moveList";
import { DetermineGameStateRValue } from "../../engine/types/gameState";
import { createUndo } from "../../engine/types/history";
import { Position } from "../../engine/types/position";
import { CHECKMATE_SCORE } from "../constants/eval";
import { MAX_QUIESCENCE_PLY } from "../constants/search";
import { SIMPLE_EVALUATOR } from "../eval/evaluator";
import { createKillerMoves } from "./killerMoves";
import { createMoveOrderingScratch } from "./moveOrdering";
import { normalizeSearchLimits } from "./searchStrength";
import { createNullMoveUndo } from "../types/nullMove";
import {
  SearchControl,
  SearchLimits,
  SearchScratch,
  SearchState,
} from "../types/search";
import type { SearchEvaluator } from "../types/nnue";

export const createSearchState = (
  position: Position,
  repetitionCounts: Map<bigint, number>,
): SearchState => {
  const clonedRepetitionCounts = new Map(repetitionCounts);
  const clonedPosition = clonePosition(position);

  if (!clonedRepetitionCounts.has(clonedPosition.zobristHash)) {
    clonedRepetitionCounts.set(clonedPosition.zobristHash, 1);
  }

  return {
    position: clonedPosition,
    repetitionCounts: clonedRepetitionCounts,
  };
};

export const createSearchScratch = (depth: number): SearchScratch => {
  const searchPlyCount = Math.max(0, depth) + MAX_QUIESCENCE_PLY + 1;
  const moveLists = Array.from({ length: searchPlyCount }, () =>
    createMoveList(),
  );
  const contexts = moveLists.map((moveList) =>
    createMoveGenerationContext(moveList),
  );
  const attackInfos = Array.from({ length: searchPlyCount }, () =>
    createAttackInfo(),
  );
  const undoStack = Array.from({ length: searchPlyCount }, () => createUndo());
  const nullMoveUndoStack = Array.from(
    { length: searchPlyCount },
    () => createNullMoveUndo(),
  );
  const pvTable = Array.from(
    { length: searchPlyCount },
    () => new Uint32Array(searchPlyCount),
  );
  const moveOrderingScratches = Array.from(
    { length: searchPlyCount },
    () => createMoveOrderingScratch(),
  );

  return {
    moveLists,
    contexts,
    attackInfos,
    undoStack,
    nullMoveUndoStack,
    pvTable,
    pvLength: new Uint16Array(searchPlyCount),
    moveOrderingScratches,
    killerMoves: createKillerMoves(searchPlyCount),
    gameStateScratch: {
      gameState: GAME_STATE.ONGOING,
      gameEndReason: null,
    },
  };
};

export const getTerminalScore = (
  gameStateScratch: DetermineGameStateRValue,
  ply: number,
): number | null => {
  if (gameStateScratch.gameState === GAME_STATE.ONGOING) {
    return null;
  }

  if (gameStateScratch.gameState === GAME_STATE.CHECKMATE) {
    return -CHECKMATE_SCORE + ply;
  }

  return 0;
};

export const createSearchControl = (
  limits: SearchLimits = {},
  evaluator: SearchEvaluator = SIMPLE_EVALUATOR,
): SearchControl => ({
  limits: normalizeSearchLimits(limits),
  evaluator,
  nodes: 0,
  startTime: Date.now(),
  stopped: false,
  isPreviousMoveNull: false,
});

export const shouldStopSearch = (control: SearchControl): boolean => {
  if (control.stopped) {
    return true;
  }

  if (
    control.limits.maxTimeMs !== undefined &&
    Date.now() - control.startTime >= control.limits.maxTimeMs
  ) {
    control.stopped = true;

    return true;
  }

  if (
    control.limits.maxNodes !== undefined &&
    control.nodes >= control.limits.maxNodes
  ) {
    control.stopped = true;

    return true;
  }

  control.nodes++;

  return false;
};

export const getSearchElapsedTimeMs = (control: SearchControl): number =>
  Date.now() - control.startTime;
