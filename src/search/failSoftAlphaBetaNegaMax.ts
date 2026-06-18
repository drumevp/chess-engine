/**
 * Enhanced minimax search algorithm.
 *
 * https://www.chessprogramming.org/Alpha-Beta
 *
 *
 */

import { GAME_STATE } from "../engine/constants/gameState";
import clonePosition from "../engine/helpers/clonePosition";
import generateAttackInfo, {
  createAttackInfo,
} from "../engine/movegen/attackInfo/main";
import generateLegalMovesFromContext from "../engine/movegen/generateLegalMovesFromContext";
import getMoveGenerationContext, {
  createMoveGenerationContext,
} from "../engine/movegen/getMoveGenerationContext";
import { createMoveList } from "../engine/movegen/moveList";
import determineGameState from "../engine/position/analyzePosition/determineGameState";
import { makeMoveWithUndo } from "../engine/position/moves/makeMove/makeMove";
import undoMove from "../engine/position/moves/undoMove/undoMove";
import { AttackInfo } from "../engine/types/attackInfo";
import { DetermineGameStateRValue } from "../engine/types/gameState";
import { createUndo, Undo } from "../engine/types/history";
import { MoveGenerationContext, MoveList } from "../engine/types/move";
import { Position } from "../engine/types/position";
import { CHECKMATE_SCORE } from "./constants/eval";
import simpleEval from "./simpleEval";

const failSoftAlphaBetaNegaMax = (
  position: Position,
  repetitionCounts: Map<bigint, number>,
  alpha: number,
  beta: number,
  depth: number,
): number => {
  const searchPlyCount = depth + 1;
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

  // Cloning these to avoid changing the reference values if the caller is ChessEngine.
  const clonedRepetitionCounts = new Map(repetitionCounts);
  const clonedPosition = clonePosition(position);

  const gameStateScratch: DetermineGameStateRValue = {
    gameState: GAME_STATE.ONGOING,
    gameEndReason: null,
  };

  return failSoftAlphaBetaNegaMaxRecursive(
    clonedPosition,
    alpha,
    beta,
    depth,
    0,
    moveLists,
    contexts,
    attackInfos,
    undoStack,
    gameStateScratch,
    clonedRepetitionCounts,
  );
};

const failSoftAlphaBetaNegaMaxRecursive = (
  position: Position,
  alpha: number,
  beta: number,
  depth: number,
  ply: number,
  moveLists: MoveList[],
  contexts: MoveGenerationContext[],
  attackInfos: AttackInfo[],
  undoStack: Undo[],
  gameStateScratch: DetermineGameStateRValue,
  repetitionCounts: Map<bigint, number>,
): number => {
  const moveList = moveLists[ply];
  const ctx = getMoveGenerationContext(position, moveList, contexts[ply]);
  const attackInfo = generateAttackInfo(ctx, attackInfos[ply]);
  const movesCount = generateLegalMovesFromContext(ctx, attackInfo);

  const isCheck = attackInfo.checkCount > 0;

  determineGameState(
    position,
    repetitionCounts,
    movesCount,
    isCheck,
    gameStateScratch,
  );

  if (gameStateScratch.gameState !== GAME_STATE.ONGOING) {
    if (gameStateScratch.gameState === GAME_STATE.CHECKMATE) {
      return -CHECKMATE_SCORE + ply;
    }

    return 0;
  }

  if (depth === 0) {
    return simpleEval(position);
  }

  let bestScore = -Infinity;

  for (let i = 0; i < movesCount; i++) {
    const move = moveList.moves[i];
    const undo = undoStack[ply];

    makeMoveWithUndo(position, move, undo, { updateZobristHash: true });

    /**
     * Zobrist hash increment
     */
    const currentHashCount = repetitionCounts.get(position.zobristHash) ?? 0;
    repetitionCounts.set(position.zobristHash, currentHashCount + 1);
    const childHash = position.zobristHash;

    const score = -failSoftAlphaBetaNegaMaxRecursive(
      position,
      -beta,
      -alpha,
      depth - 1,
      ply + 1,
      moveLists,
      contexts,
      attackInfos,
      undoStack,
      gameStateScratch,
      repetitionCounts,
    );

    undoMove(position, move, undo);

    /**
     * Zobrist hash decrement
     */
    const hashToRemove = childHash;
    const previousHashCount = repetitionCounts.get(hashToRemove) ?? 0;

    if (previousHashCount <= 1) {
      repetitionCounts.delete(hashToRemove);
    } else {
      repetitionCounts.set(hashToRemove, previousHashCount - 1);
    }

    if (score > bestScore) {
      bestScore = score;
    }

    if (score > alpha) {
      alpha = score;
    }

    if (score >= beta) {
      return score;
    }
  }

  return bestScore;
};

export default failSoftAlphaBetaNegaMax;
