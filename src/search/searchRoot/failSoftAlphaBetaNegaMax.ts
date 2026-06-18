/**
 * Enhanced minimax search algorithm.
 *
 * https://www.chessprogramming.org/Alpha-Beta
 *
 *
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
import simpleEval from "../eval/simpleEval";
import { getTerminalScore, shouldStopSearch } from "../helpers/search";
import { SearchControl } from "../types/search";
import quiescenceSearch from "./quiescenceSearch";

export const failSoftAlphaBetaNegaMax = (
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
  control: SearchControl,
): number => {
  if (shouldStopSearch(control)) {
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

  if (depth === 0) {
    return quiescenceSearch(
      position,
      alpha,
      beta,
      ply,
      moveLists,
      contexts,
      attackInfos,
      undoStack,
      gameStateScratch,
      repetitionCounts,
      control,
    );
  }

  let bestScore = -Infinity;

  for (let i = 0; i < movesCount; i++) {
    const move = moveList.moves[i];
    const undo = undoStack[ply];

    makeMoveWithUndo(position, move, undo, { updateZobristHash: true });
    incrementRepetition(repetitionCounts, position.zobristHash);
    const childHash = position.zobristHash;

    const score = -failSoftAlphaBetaNegaMax(
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

export default failSoftAlphaBetaNegaMax;
