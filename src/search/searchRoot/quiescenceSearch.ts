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
import determineGameState, {
  determineDrawGameState,
} from "../../engine/position/analyzePosition/determineGameState";
import { makeMoveWithUndo } from "../../engine/position/moves/makeMove/makeMove";
import undoMove from "../../engine/position/moves/undoMove/undoMove";
import { Position } from "../../engine/types/position";
import {
  evaluatePosition,
  popEvaluatorMove,
  pushEvaluatorMove,
} from "../eval/evaluator";
import { getCorrectedStaticEval } from "../helpers/correctionHistory";
import {
  resetPrincipalVariation,
  updatePrincipalVariation,
} from "../helpers/principalVariation";
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
import type { CorrectionHistory } from "../types/correctionHistory";

const quiescenceSearch = (
  position: Position,
  alpha: number,
  beta: number,
  ply: number,
  scratch: SearchScratch,
  repetitionCounts: Map<bigint, number>,
  control: SearchControl,
  captureHistory: CaptureHistory,
  correctionHistory: CorrectionHistory,
): number => {
  if (shouldStopSearch(control, ply)) {
    return getCorrectedStaticEval(
      position,
      correctionHistory,
      evaluatePosition(control.evaluator, position),
    );
  }

  control.qNodes++;

  if (ply >= scratch.moveLists.length) {
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
  const isCheck = attackInfo.checkCount > 0;

  if (!isCheck) {
    determineDrawGameState(
      position,
      repetitionCounts,
      scratch.gameStateScratch,
    );

    const drawScore = getTerminalScore(scratch.gameStateScratch, ply);

    if (drawScore !== null) {
      return drawScore;
    }
  }

  alpha = getMateDistancePrunedAlpha(alpha, ply);
  beta = getMateDistancePrunedBeta(beta, ply);

  if (isMateDistancePruned(alpha, beta)) {
    return alpha;
  }

  let bestScore = -Infinity;

  if (!isCheck) {
    const standPat = getCorrectedStaticEval(
      position,
      correctionHistory,
      evaluatePosition(control.evaluator, position),
    );
    bestScore = standPat;

    if (standPat >= beta) {
      return standPat;
    }

    if (standPat > alpha) {
      alpha = standPat;
    }
  }

  const movesCount = generateLegalMovesFromContext(ctx, attackInfo, !isCheck);

  if (isCheck) {
    determineGameState(
      position,
      repetitionCounts,
      movesCount,
      true,
      scratch.gameStateScratch,
    );

    const terminalScore = getTerminalScore(scratch.gameStateScratch, ply);

    if (terminalScore !== null) {
      return terminalScore;
    }
  }

  orderMoves(
    position,
    moveList,
    movesCount,
    scratch.moveOrderingScratches[ply],
    null,
    null,
    null,
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

    const score = -quiescenceSearch(
      position,
      -beta,
      -alpha,
      ply + 1,
      scratch,
      repetitionCounts,
      control,
      captureHistory,
      correctionHistory,
    );

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
    }

    if (score > alpha) {
      alpha = score;
      updatePrincipalVariation(scratch, ply, move);
    }

    if (score >= beta) {
      return score;
    }
  }

  return bestScore;
};

export default quiescenceSearch;
