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
  PRIORITY_MOVE_SCORE,
  PROMOTION_CAPTURE_SCORE,
  PROMOTION_SCORE,
} from "../constants/moveOrdering";
import { getPieceValue } from "../constants/eval";
import staticExchangeEvaluation from "../searchRoot/staticExchangeEvaluation/staticExchangeEvaluation";
import { createStaticExchangeEvaluationScratch } from "../searchRoot/staticExchangeEvaluation/scratch";
import type { StaticExchangeEvaluationScratch } from "../types/staticExchangeEvaluation";

export type MoveOrderingScratch = {
  scores: Int32Array;
  staticExchangeEvaluation: StaticExchangeEvaluationScratch;
};

export const createMoveOrderingScratch = (): MoveOrderingScratch => ({
  scores: new Int32Array(MAX_MOVES),
  staticExchangeEvaluation: createStaticExchangeEvaluationScratch(),
});

export const scoreMove = (
  position: Position,
  move: number,
  scratch: MoveOrderingScratch,
  priorityMove: number | null = null,
): number => {
  if (priorityMove !== null && move === priorityMove) {
    return PRIORITY_MOVE_SCORE;
  }

  const moveFlag = moveDecodeFlag(move);

  if (moveFlag === MOVE_FLAG.PROMOTION_CAPTURE) {
    return (
      PROMOTION_CAPTURE_SCORE +
      staticExchangeEvaluation(
        position,
        move,
        scratch.staticExchangeEvaluation,
      )
    );
  }

  if (moveFlag === MOVE_FLAG.CAPTURE) {
    return (
      CAPTURE_SCORE +
      staticExchangeEvaluation(
        position,
        move,
        scratch.staticExchangeEvaluation,
      )
    );
  }

  if (moveFlag === MOVE_FLAG.EN_PASSANT) {
    return (
      EN_PASSANT_SCORE +
      staticExchangeEvaluation(
        position,
        move,
        scratch.staticExchangeEvaluation,
      )
    );
  }

  if (moveFlag === MOVE_FLAG.PROMOTION) {
    return PROMOTION_SCORE + getPieceValue(moveDecodePromotionPiece(move));
  }

  return 0;
};

export const orderMoves = (
  position: Position,
  moveList: MoveList,
  movesCount: number,
  scratch: MoveOrderingScratch,
  priorityMove: number | null = null,
): void => {
  const moves = moveList.moves;
  const scores = scratch.scores;

  for (let i = 0; i < movesCount; i++) {
    scores[i] = scoreMove(position, moves[i], scratch, priorityMove);
  }

  for (let i = 0; i < movesCount - 1; i++) {
    let bestIndex = i;
    let bestScore = scores[i];

    for (let j = i + 1; j < movesCount; j++) {
      const score = scores[j];

      if (score > bestScore) {
        bestScore = score;
        bestIndex = j;
      }
    }

    if (bestIndex !== i) {
      const currentMove = moves[i];
      moves[i] = moves[bestIndex];
      moves[bestIndex] = currentMove;

      const currentScore = scores[i];
      scores[i] = scores[bestIndex];
      scores[bestIndex] = currentScore;
    }
  }
};
