import { MOVE_FLAG } from "../../engine/constants/move";
import {
  moveDecodeFlag,
  moveDecodePromotionPiece,
} from "../../engine/position/moves/packedMove";
import { MAX_MOVES } from "../../engine/movegen/moveList";
import { MoveList } from "../../engine/types/move";
import { Position } from "../../engine/types/position";
import {
  CAPTURE_SCORE,
  EN_PASSANT_SCORE,
  KILLER_MOVE_SCORE,
  PRIORITY_MOVE_SCORE,
  PROMOTION_CAPTURE_SCORE,
  PROMOTION_SCORE,
} from "../constants/moveOrdering";
import { getPieceValue } from "../constants/eval";
import { getCaptureHistoryScore } from "./captureHistory";
import { getHistoryHeuristicScore } from "./historyHeuristic";
import { isKillerMove } from "./killerMoves";
import staticExchangeEvaluation from "../searchRoot/staticExchangeEvaluation/staticExchangeEvaluation";
import { createStaticExchangeEvaluationScratch } from "../searchRoot/staticExchangeEvaluation/scratch";
import type { CaptureHistory } from "../types/captureHistory";
import type { HistoryHeuristic } from "../types/historyHeuristic";
import type { KillerMoves } from "../types/killerMoves";
import type { StaticExchangeEvaluationScratch } from "../types/staticExchangeEvaluation";

export type MoveOrderingScratch = {
  scores: Int32Array;
  staticExchangeScores: Int32Array;
  staticExchangeEvaluation: StaticExchangeEvaluationScratch;
};

const BAD_CAPTURE_SCORE = -10_000;

export const createMoveOrderingScratch = (): MoveOrderingScratch => ({
  scores: new Int32Array(MAX_MOVES),
  staticExchangeScores: new Int32Array(MAX_MOVES),
  staticExchangeEvaluation: createStaticExchangeEvaluationScratch(),
});

const getMoveStaticExchangeEvaluationScore = (
  position: Position,
  move: number,
  scratch: MoveOrderingScratch,
): number => {
  const moveFlag = moveDecodeFlag(move);

  if (
    moveFlag === MOVE_FLAG.CAPTURE ||
    moveFlag === MOVE_FLAG.PROMOTION_CAPTURE ||
    moveFlag === MOVE_FLAG.EN_PASSANT ||
    moveFlag === MOVE_FLAG.PROMOTION
  ) {
    return staticExchangeEvaluation(
      position,
      move,
      scratch.staticExchangeEvaluation,
    );
  }

  return 0;
};

const scoreMoveWithStaticExchangeEvaluation = (
  move: number,
  staticExchangeEvaluationScore: number,
  priorityMove: number | null = null,
  killerMoves: KillerMoves | null = null,
  historyHeuristic: HistoryHeuristic | null = null,
  captureHistory: CaptureHistory | null = null,
  ply = 0,
): number => {
  if (priorityMove !== null && move === priorityMove) {
    return PRIORITY_MOVE_SCORE;
  }

  const moveFlag = moveDecodeFlag(move);

  if (moveFlag === MOVE_FLAG.PROMOTION_CAPTURE) {
    return (
      (staticExchangeEvaluationScore >= 0
        ? PROMOTION_CAPTURE_SCORE
        : BAD_CAPTURE_SCORE) +
      staticExchangeEvaluationScore +
      (captureHistory === null
        ? 0
        : getCaptureHistoryScore(captureHistory, move))
    );
  }

  if (moveFlag === MOVE_FLAG.CAPTURE) {
    return (
      (staticExchangeEvaluationScore >= 0
        ? CAPTURE_SCORE
        : BAD_CAPTURE_SCORE) +
      staticExchangeEvaluationScore +
      (captureHistory === null
        ? 0
        : getCaptureHistoryScore(captureHistory, move))
    );
  }

  if (moveFlag === MOVE_FLAG.EN_PASSANT) {
    return (
      (staticExchangeEvaluationScore >= 0
        ? EN_PASSANT_SCORE
        : BAD_CAPTURE_SCORE) +
      staticExchangeEvaluationScore +
      (captureHistory === null
        ? 0
        : getCaptureHistoryScore(captureHistory, move))
    );
  }

  if (moveFlag === MOVE_FLAG.PROMOTION) {
    return (
      PROMOTION_SCORE +
      getPieceValue(moveDecodePromotionPiece(move)) +
      staticExchangeEvaluationScore
    );
  }

  if (killerMoves !== null && isKillerMove(killerMoves, ply, move)) {
    return KILLER_MOVE_SCORE;
  }

  if (historyHeuristic !== null) {
    return getHistoryHeuristicScore(historyHeuristic, move);
  }

  return 0;
};

export const scoreMove = (
  position: Position,
  move: number,
  scratch: MoveOrderingScratch,
  priorityMove: number | null = null,
  killerMoves: KillerMoves | null = null,
  historyHeuristic: HistoryHeuristic | null = null,
  captureHistory: CaptureHistory | null = null,
  ply = 0,
): number =>
  scoreMoveWithStaticExchangeEvaluation(
    move,
    getMoveStaticExchangeEvaluationScore(position, move, scratch),
    priorityMove,
    killerMoves,
    historyHeuristic,
    captureHistory,
    ply,
  );

export const orderMoves = (
  position: Position,
  moveList: MoveList,
  movesCount: number,
  scratch: MoveOrderingScratch,
  priorityMove: number | null = null,
  killerMoves: KillerMoves | null = null,
  historyHeuristic: HistoryHeuristic | null = null,
  captureHistory: CaptureHistory | null = null,
  ply = 0,
): void => {
  const moves = moveList.moves;
  const scores = scratch.scores;
  const staticExchangeScores = scratch.staticExchangeScores;

  for (let i = 0; i < movesCount; i++) {
    const move = moves[i];
    const staticExchangeEvaluationScore =
      getMoveStaticExchangeEvaluationScore(position, move, scratch);

    staticExchangeScores[i] = staticExchangeEvaluationScore;
    scores[i] = scoreMoveWithStaticExchangeEvaluation(
      move,
      staticExchangeEvaluationScore,
      priorityMove,
      killerMoves,
      historyHeuristic,
      captureHistory,
      ply,
    );
  }
};

export const selectNextMove = (
  moveList: MoveList,
  movesCount: number,
  scratch: MoveOrderingScratch,
  moveIndex: number,
): void => {
  const moves = moveList.moves;
  const scores = scratch.scores;
  const staticExchangeScores = scratch.staticExchangeScores;
  let bestIndex = moveIndex;
  let bestScore = scores[moveIndex];

  for (let i = moveIndex + 1; i < movesCount; i++) {
    const score = scores[i];

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex === moveIndex) {
    return;
  }

  const currentMove = moves[moveIndex];
  moves[moveIndex] = moves[bestIndex];
  moves[bestIndex] = currentMove;

  const currentScore = scores[moveIndex];
  scores[moveIndex] = scores[bestIndex];
  scores[bestIndex] = currentScore;

  const currentStaticExchangeScore = staticExchangeScores[moveIndex];
  staticExchangeScores[moveIndex] = staticExchangeScores[bestIndex];
  staticExchangeScores[bestIndex] = currentStaticExchangeScore;
};
