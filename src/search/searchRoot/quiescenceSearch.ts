/**
 * https://www.chessprogramming.org/Quiescence_Search
 *
 * This almost the same as the normal search, but for non-quiet moves.
 * We use this handler at depth 0 to make sure the continuation of the position
 * doesn't leave us at a disadvantage.
 */

import {
  decrementRepetition,
  incrementRepetition,
} from "../../engine/helpers/zobristHashRepetition";
import generateAttackInfo from "../../engine/movegen/attackInfo/main";
import generateLegalMovesFromContext from "../../engine/movegen/generateLegalMovesFromContext";
import getMoveGenerationContext from "../../engine/movegen/getMoveGenerationContext";
import determineGameState from "../../engine/position/analyzePosition/determineGameState";
import { makeMoveWithUndo } from "../../engine/position/moves/makeMove/makeMove";
import undoMove from "../../engine/position/moves/undoMove/undoMove";
import { AttackInfo } from "../../engine/types/attackInfo";
import { DetermineGameStateRValue } from "../../engine/types/gameState";
import { Undo } from "../../engine/types/history";
import { MoveGenerationContext, MoveList } from "../../engine/types/move";
import { Position } from "../../engine/types/position";
import { isQuiescenceMove } from "../constants/search";
import simpleEval from "../eval/simpleEval";
import { getTerminalScore, shouldStopSearch } from "../helpers/search";
import { SearchControl } from "../types/search";

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
  control: SearchControl,
): number => {
  if (shouldStopSearch(control)) {
    return simpleEval(position);
  }

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

  const terminalScore = getTerminalScore(gameStateScratch, ply);

  if (terminalScore !== null) {
    return terminalScore;
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
    incrementRepetition(repetitionCounts, position.zobristHash);
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
      control,
    );

    undoMove(position, move, undo);
    decrementRepetition(repetitionCounts, childHash);

    if (control.stopped) {
      return bestScore === -Infinity ? simpleEval(position) : bestScore;
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
