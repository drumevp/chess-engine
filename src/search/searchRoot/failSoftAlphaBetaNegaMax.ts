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
  resetEvaluator,
} from "../eval/evaluator";
import { recordCaptureHistory } from "../helpers/captureHistory";
import {
  getCorrectedStaticEval,
  recordCorrectionHistory,
} from "../helpers/correctionHistory";
import {
  resetPrincipalVariation,
  updatePrincipalVariation,
} from "../helpers/principalVariation";
import { recordHistoryHeuristic } from "../helpers/historyHeuristic";
import { isKillerMove, recordKillerMove } from "../helpers/killerMoves";
import {
  canUseLateMoveReduction,
  getLateMoveReduction,
} from "../helpers/lateMoveReduction";
import {
  getMateDistancePrunedAlpha,
  getMateDistancePrunedBeta,
  isMateDistancePruned,
} from "../helpers/mateDistancePruning";
import { makeNullMove, undoNullMove } from "../helpers/nullMove";
import {
  canUseNullMovePruning,
  getNullMoveReduction,
} from "../helpers/nullMovePruning";
import { orderMoves } from "../helpers/moveOrdering";
import {
  canUseMoveLoopFutilityPruning,
  isMoveLoopFutilityPruned,
} from "../helpers/moveLoopFutilityPruning";
import {
  canUseProbCut,
  getProbCutBeta,
  getProbCutSearchDepth,
  tryProbCut,
} from "../helpers/probCut";
import {
  canUseRazoring,
  isRazoringCandidate,
} from "../helpers/razoring";
import {
  canUseReverseFutilityPruning,
  isReverseFutilityPruned,
} from "../helpers/reverseFutilityPruning";
import {
  getTerminalScore,
  shouldStopSearch,
} from "../helpers/search";
import {
  canUseSingularExtension,
  getSingularExtensionAmount,
  getSingularExtensionBeta,
  getSingularExtensionSearchDepth,
} from "../helpers/singularExtension";
import {
  canUseStaticExchangeEvaluationPruning,
  hasMoveOrderingStaticExchangeEvaluationScore,
  isStaticExchangeEvaluationPruned,
} from "../helpers/staticExchangeEvaluationPruning";
import { SearchControl, SearchScratch } from "../types/search";
import type { CaptureHistory } from "../types/captureHistory";
import type { CorrectionHistory } from "../types/correctionHistory";
import type { HistoryHeuristic } from "../types/historyHeuristic";
import { TranspositionTable } from "../types/transpositionTable";
import {
  getTranspositionTableEntry,
  probeTranspositionTable,
  storeTranspositionTable,
} from "../transpositionTable/transpositionTable";
import quiescenceSearch from "./quiescenceSearch";
import staticExchangeEvaluation from "./staticExchangeEvaluation/staticExchangeEvaluation";

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
  correctionHistory: CorrectionHistory,
  excludedMove: number | null = null,
): number => {
  const isExcludedMoveSearch = excludedMove !== null;

  if (depth <= 0) {
    return quiescenceSearch(
      position,
      alpha,
      beta,
      ply,
      scratch,
      repetitionCounts,
      control,
      captureHistory,
      correctionHistory,
    );
  }

  if (shouldStopSearch(control, ply)) {
    return getCorrectedStaticEval(
      position,
      correctionHistory,
      evaluatePosition(control.evaluator, position),
    );
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

  const transpositionTableEntry = isExcludedMoveSearch
    ? null
    : getTranspositionTableEntry(transpositionTable, position.zobristHash, ply);

  if (!isExcludedMoveSearch) {
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
  }

  const rawStaticEval = evaluatePosition(control.evaluator, position);
  const staticEval = getCorrectedStaticEval(
    position,
    correctionHistory,
    rawStaticEval,
  );

  if (
    canUseRazoring(depth, alpha, beta, isCheck) &&
    isRazoringCandidate(staticEval, alpha, depth)
  ) {
    const score = quiescenceSearch(
      position,
      alpha,
      alpha + 1,
      ply,
      scratch,
      repetitionCounts,
      control,
      captureHistory,
      correctionHistory,
    );

    if (control.stopped || score <= alpha) {
      return score;
    }
  }

  if (canUseReverseFutilityPruning(depth, beta, isCheck)) {
    if (isReverseFutilityPruned(staticEval, beta, depth)) {
      return staticEval;
    }
  }

  if (
    canUseNullMovePruning(
      position,
      depth,
      beta,
      isCheck,
      control.isPreviousMoveNull,
      staticEval,
    )
  ) {
    const nullMoveUndo = scratch.nullMoveUndoStack[ply];
    const reduction = getNullMoveReduction(depth);
    const nullMoveDepth = Math.max(0, depth - reduction - 1);
    const wasPreviousMoveNull = control.isPreviousMoveNull;

    makeNullMove(position, nullMoveUndo);
    control.isPreviousMoveNull = true;

    const score = -failSoftAlphaBetaNegaMax(
      position,
      -beta,
      -beta + 1,
      nullMoveDepth,
      ply + 1,
      scratch,
      repetitionCounts,
      control,
      transpositionTable,
      historyHeuristic,
      captureHistory,
      correctionHistory,
    );

    control.isPreviousMoveNull = wasPreviousMoveNull;
    undoNullMove(position, nullMoveUndo);
    resetEvaluator(control.evaluator, position);

    if (control.stopped) {
      return staticEval;
    }

    if (score >= beta) {
      return score;
    }
  }

  let bestScore = -Infinity;
  let bestMove: number | null = null;
  const moveOrderingScratch = scratch.moveOrderingScratches[ply];
  const transpositionTableBestMove = transpositionTableEntry?.bestMove ?? null;

  orderMoves(
    position,
    moveList,
    movesCount,
    moveOrderingScratch,
    transpositionTableBestMove,
    scratch.killerMoves,
    historyHeuristic,
    captureHistory,
    ply,
  );

  if (canUseProbCut(depth, beta, isCheck)) {
    const probCutScore = tryProbCut(
      failSoftAlphaBetaNegaMax,
      position,
      moveList,
      movesCount,
      getProbCutBeta(beta),
      getProbCutSearchDepth(depth),
      ply,
      scratch,
      repetitionCounts,
      control,
      transpositionTable,
      historyHeuristic,
      captureHistory,
      correctionHistory,
    );

    if (probCutScore !== null) {
      return probCutScore;
    }
  }

  for (let i = 0; i < movesCount; i++) {
    const move = moveList.moves[i];

    if (isExcludedMoveSearch && move === excludedMove) {
      continue;
    }

    const undo = scratch.undoStack[ply];
    const hasSearchedMove = bestScore !== -Infinity;
    const isImportantMove =
      (transpositionTableBestMove !== null &&
        move === transpositionTableBestMove) ||
      isKillerMove(scratch.killerMoves, ply, move);

    if (
      canUseMoveLoopFutilityPruning(
        depth,
        alpha,
        isCheck,
        hasSearchedMove,
        i,
        move,
        isImportantMove,
      ) &&
      isMoveLoopFutilityPruned(staticEval, alpha, depth)
    ) {
      continue;
    }

    if (
      canUseStaticExchangeEvaluationPruning(
        depth,
        alpha,
        isCheck,
        hasSearchedMove,
        i,
        move,
        isImportantMove,
      )
    ) {
      const staticExchangeEvaluationScore =
        hasMoveOrderingStaticExchangeEvaluationScore(move)
          ? moveOrderingScratch.staticExchangeScores[i]
          : staticExchangeEvaluation(
              position,
              move,
              moveOrderingScratch.staticExchangeEvaluation,
            );

      if (
        isStaticExchangeEvaluationPruned(
          move,
          staticExchangeEvaluationScore,
          depth,
        )
      ) {
        continue;
      }
    }

    let extension = 0;

    if (
      transpositionTableEntry !== null &&
      canUseSingularExtension(
        depth,
        isCheck,
        excludedMove,
        transpositionTableEntry,
        move,
      )
    ) {
      const singularBeta = getSingularExtensionBeta(
        transpositionTableEntry.score,
        depth,
      );
      const singularScore = failSoftAlphaBetaNegaMax(
        position,
        singularBeta - 1,
        singularBeta,
        getSingularExtensionSearchDepth(depth),
        ply + 1,
        scratch,
        repetitionCounts,
        control,
        transpositionTable,
        historyHeuristic,
        captureHistory,
        correctionHistory,
        move,
      );

      if (control.stopped) {
        return bestScore === -Infinity
          ? getCorrectedStaticEval(
              position,
              correctionHistory,
              evaluatePosition(control.evaluator, position),
            )
          : bestScore;
      }

      if (singularScore < singularBeta) {
        extension = getSingularExtensionAmount();
      }
    }

    makeMoveWithUndo(position, move, undo, { updateZobristHash: true });
    pushEvaluatorMove(control.evaluator, position, move, undo);
    incrementRepetition(repetitionCounts, position.zobristHash);
    const childHash = position.zobristHash;

    let score: number;
    const childDepth = depth - 1 + extension;

    if (i === 0) {
      score = -failSoftAlphaBetaNegaMax(
        position,
        -beta,
        -alpha,
        childDepth,
        ply + 1,
        scratch,
        repetitionCounts,
        control,
        transpositionTable,
        historyHeuristic,
        captureHistory,
        correctionHistory,
      );
    } else {
      if (canUseLateMoveReduction(depth, i, isCheck, move)) {
        const reduction = Math.min(
          getLateMoveReduction(depth, i),
          childDepth - 1,
        );

        score = -failSoftAlphaBetaNegaMax(
          position,
          -alpha - 1,
          -alpha,
          childDepth - reduction,
          ply + 1,
          scratch,
          repetitionCounts,
          control,
          transpositionTable,
          historyHeuristic,
          captureHistory,
          correctionHistory,
        );

        if (!control.stopped && score > alpha) {
          score = -failSoftAlphaBetaNegaMax(
            position,
            -alpha - 1,
            -alpha,
            childDepth,
            ply + 1,
            scratch,
            repetitionCounts,
            control,
            transpositionTable,
            historyHeuristic,
            captureHistory,
            correctionHistory,
          );
        }
      } else {
        score = -failSoftAlphaBetaNegaMax(
          position,
          -alpha - 1,
          -alpha,
          childDepth,
          ply + 1,
          scratch,
          repetitionCounts,
          control,
          transpositionTable,
          historyHeuristic,
          captureHistory,
          correctionHistory,
        );
      }

      if (!control.stopped && score > alpha && score < beta) {
        score = -failSoftAlphaBetaNegaMax(
          position,
          -beta,
          -alpha,
          childDepth,
          ply + 1,
          scratch,
          repetitionCounts,
          control,
          transpositionTable,
          historyHeuristic,
          captureHistory,
          correctionHistory,
        );
      }
    }

    undoMove(position, move, undo);
    decrementRepetition(repetitionCounts, childHash);
    popEvaluatorMove(control.evaluator);

    if (control.stopped) {
      return bestScore === -Infinity
        ? getCorrectedStaticEval(
            position,
            correctionHistory,
            evaluatePosition(control.evaluator, position),
          )
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
      if (!isExcludedMoveSearch) {
        recordCorrectionHistory(
          correctionHistory,
          position,
          depth,
          rawStaticEval,
          staticEval,
          score,
          originalAlpha,
          beta,
          isCheck,
        );
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
      }

      return score;
    }
  }

  if (isExcludedMoveSearch) {
    return bestScore === -Infinity ? alpha : bestScore;
  }

  recordCorrectionHistory(
    correctionHistory,
    position,
    depth,
    rawStaticEval,
    staticEval,
    bestScore,
    originalAlpha,
    beta,
    isCheck,
  );

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
