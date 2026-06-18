/**
 * https://www.chessprogramming.org/Quiescence_Search
 *
 * This almost the same as the normal search, but for non-quiet moves.
 * We use this handler at depth 0 to make sure the continuation of the position
 * doesn't leave us at a disadvantage.
 */

import { GAME_STATE } from "../engine/constants/gameState";
import generateAttackInfo from "../engine/movegen/attackInfo/main";
import generateLegalMovesFromContext from "../engine/movegen/generateLegalMovesFromContext";
import getMoveGenerationContext from "../engine/movegen/getMoveGenerationContext";
import determineGameState from "../engine/position/analyzePosition/determineGameState";
import { makeMoveWithUndo } from "../engine/position/moves/makeMove/makeMove";
import undoMove from "../engine/position/moves/undoMove/undoMove";
import { AttackInfo } from "../engine/types/attackInfo";
import { DetermineGameStateRValue } from "../engine/types/gameState";
import { Undo } from "../engine/types/history";
import { MoveGenerationContext, MoveList } from "../engine/types/move";
import { Position } from "../engine/types/position";
import { CHECKMATE_SCORE } from "./constants/eval";
import { isQuiescenceMove } from "./constants/search";
import simpleEval from "./simpleEval";

const quiescenceSearch = (
  position: Position,
  alpha: number,
  beta: number,
  ply: number,
  moveLists: MoveList[],
  contexts: MoveGenerationContext[],
  attackInfos: AttackInfo[],
  undoStack: Undo[],
  gameStateScratch: DetermineGameStateRValue,
  repetitionCounts: Map<bigint, number>,
): number => {
  if (ply >= moveLists.length) {
    return simpleEval(position);
  }

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

  let bestScore = -Infinity;

  if (!isCheck) {
    const standPat = simpleEval(position);
    bestScore = standPat;

    if (standPat >= beta) {
      return standPat;
    }

    if (standPat > alpha) {
      alpha = standPat;
    }
  }

  for (let i = 0; i < movesCount; i++) {
    const move = moveList.moves[i];
    const undo = undoStack[ply];

    if (!isCheck && !isQuiescenceMove(move)) {
      continue;
    }

    makeMoveWithUndo(position, move, undo, { updateZobristHash: true });

    const currentHashCount = repetitionCounts.get(position.zobristHash) ?? 0;
    repetitionCounts.set(position.zobristHash, currentHashCount + 1);
    const childHash = position.zobristHash;

    const score = -quiescenceSearch(
      position,
      -beta,
      -alpha,
      ply + 1,
      moveLists,
      contexts,
      attackInfos,
      undoStack,
      gameStateScratch,
      repetitionCounts,
    );

    undoMove(position, move, undo);

    const previousHashCount = repetitionCounts.get(childHash) ?? 0;

    if (previousHashCount <= 1) {
      repetitionCounts.delete(childHash);
    } else {
      repetitionCounts.set(childHash, previousHashCount - 1);
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

export default quiescenceSearch;
