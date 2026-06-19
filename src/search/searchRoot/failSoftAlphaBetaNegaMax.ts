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
import { Position } from "../../engine/types/position";
import { TRANSPOSITION_TABLE_BOUND } from "../constants/transpositionTable";
import {
  evaluatePosition,
  popEvaluatorMove,
  pushEvaluatorMove,
} from "../eval/evaluator";
import { recordCaptureHistory } from "../helpers/captureHistory";
import {
  resetPrincipalVariation,
  updatePrincipalVariation,
} from "../helpers/principalVariation";
import { recordHistoryHeuristic } from "../helpers/historyHeuristic";
import { recordKillerMove } from "../helpers/killerMoves";
import {
  getMateDistancePrunedAlpha,
  getMateDistancePrunedBeta,
  isMateDistancePruned,
} from "../helpers/mateDistancePruning";
import { orderMoves } from "../helpers/moveOrdering";
import {
  getTerminalScore,
  shouldStopSearch,
} from "../helpers/search";
import { SearchControl, SearchScratch } from "../types/search";
import type { CaptureHistory } from "../types/captureHistory";
import type { HistoryHeuristic } from "../types/historyHeuristic";
import { TranspositionTable } from "../types/transpositionTable";
import {
  getTranspositionTableBestMove,
  probeTranspositionTable,
  storeTranspositionTable,
} from "../transpositionTable/transpositionTable";
import quiescenceSearch from "./quiescenceSearch";

export const failSoftAlphaBetaNegaMax = (
  position: Position,
  alpha: number,
  beta: number,
  depth: number,
  ply: number,
  scratch: SearchScratch,
  repetitionCounts: Map<bigint, number>,
  control: SearchControl,
  transpositionTable: TranspositionTable,
  historyHeuristic: HistoryHeuristic,
  captureHistory: CaptureHistory,
): number => {
  if (shouldStopSearch(control)) {
    return evaluatePosition(control.evaluator, position);
  }

  resetPrincipalVariation(scratch, ply);

  const moveList = scratch.moveLists[ply];
  const ctx = getMoveGenerationContext(position, moveList, scratch.contexts[ply]);
  const attackInfo = generateAttackInfo(ctx, scratch.attackInfos[ply]);
  const movesCount = generateLegalMovesFromContext(ctx, attackInfo);

  const isCheck = attackInfo.checkCount > 0;

  determineGameState(
    position,
    repetitionCounts,
    movesCount,
    isCheck,
    scratch.gameStateScratch,
  );

  const terminalScore = getTerminalScore(scratch.gameStateScratch, ply);

  if (terminalScore !== null) {
    return terminalScore;
  }

  alpha = getMateDistancePrunedAlpha(alpha, ply);
  beta = getMateDistancePrunedBeta(beta, ply);

  if (isMateDistancePruned(alpha, beta)) {
    return alpha;
  }

  const originalAlpha = alpha;

  if (depth === 0) {
    return quiescenceSearch(
      position,
      alpha,
      beta,
      ply,
      scratch,
      repetitionCounts,
      control,
      captureHistory,
    );
  }

  const transpositionTableScore = probeTranspositionTable(
    transpositionTable,
    position.zobristHash,
    depth,
    alpha,
    beta,
    ply,
  );

  if (transpositionTableScore !== null) {
    return transpositionTableScore;
  }

  let bestScore = -Infinity;
  let bestMove: number | null = null;
  const transpositionTableBestMove = getTranspositionTableBestMove(
    transpositionTable,
    position.zobristHash,
  );

  orderMoves(
    position,
    moveList,
    movesCount,
    scratch.moveOrderingScratches[ply],
    transpositionTableBestMove,
    scratch.killerMoves,
    historyHeuristic,
    captureHistory,
    ply,
  );

  for (let i = 0; i < movesCount; i++) {
    const move = moveList.moves[i];
    const undo = scratch.undoStack[ply];

    makeMoveWithUndo(position, move, undo, { updateZobristHash: true });
    pushEvaluatorMove(control.evaluator, position, move, undo);
    incrementRepetition(repetitionCounts, position.zobristHash);
    const childHash = position.zobristHash;

    let score: number;

    if (i === 0) {
      score = -failSoftAlphaBetaNegaMax(
        position,
        -beta,
        -alpha,
        depth - 1,
        ply + 1,
        scratch,
        repetitionCounts,
        control,
        transpositionTable,
        historyHeuristic,
        captureHistory,
      );
    } else {
      score = -failSoftAlphaBetaNegaMax(
        position,
        -alpha - 1,
        -alpha,
        depth - 1,
        ply + 1,
        scratch,
        repetitionCounts,
        control,
        transpositionTable,
        historyHeuristic,
        captureHistory,
      );

      if (!control.stopped && score > alpha && score < beta) {
        score = -failSoftAlphaBetaNegaMax(
          position,
          -beta,
          -alpha,
          depth - 1,
          ply + 1,
          scratch,
          repetitionCounts,
          control,
          transpositionTable,
          historyHeuristic,
          captureHistory,
        );
      }
    }

    undoMove(position, move, undo);
    decrementRepetition(repetitionCounts, childHash);
    popEvaluatorMove(control.evaluator);

    if (control.stopped) {
      return bestScore === -Infinity
        ? evaluatePosition(control.evaluator, position)
        : bestScore;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }

    if (score > alpha) {
      alpha = score;
      updatePrincipalVariation(scratch, ply, move);
    }

    if (score >= beta) {
      recordKillerMove(scratch.killerMoves, ply, move);
      recordHistoryHeuristic(historyHeuristic, move, depth);
      recordCaptureHistory(captureHistory, move, depth);

      storeTranspositionTable(
        transpositionTable,
        position.zobristHash,
        depth,
        score,
        TRANSPOSITION_TABLE_BOUND.LOWER_BOUND,
        bestMove,
        ply,
      );

      return score;
    }
  }

  storeTranspositionTable(
    transpositionTable,
    position.zobristHash,
    depth,
    bestScore,
    bestScore <= originalAlpha
      ? TRANSPOSITION_TABLE_BOUND.UPPER_BOUND
      : TRANSPOSITION_TABLE_BOUND.EXACT,
    bestMove,
    ply,
  );

  return bestScore;
};

export default failSoftAlphaBetaNegaMax;
