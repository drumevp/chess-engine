import { MOVE_FLAG } from "../../engine/constants/move";
import {
  moveDecodeCapturedPiece,
  moveDecodeFlag,
  moveDecodePiece,
  moveDecodePromotionPiece,
} from "../../engine/position/moves/packedMove";
import { MoveList } from "../../engine/types/move";
import { PIECE_VALUE } from "../constants/eval";
import {
  CAPTURE_SCORE,
  EN_PASSANT_SCORE,
  PRIORITY_MOVE_SCORE,
  PROMOTION_CAPTURE_SCORE,
  PROMOTION_SCORE,
} from "../constants/moveOrdering";

const getPieceValue = (piece: number | null): number => {
  if (piece === null) {
    return 0;
  }

  return PIECE_VALUE[piece] ?? 0;
};

export const scoreMove = (
  move: number,
  priorityMove: number | null = null,
): number => {
  if (priorityMove !== null && move === priorityMove) {
    return PRIORITY_MOVE_SCORE;
  }

  const moveFlag = moveDecodeFlag(move);

  if (moveFlag === MOVE_FLAG.PROMOTION_CAPTURE) {
    return (
      PROMOTION_CAPTURE_SCORE +
      getPieceValue(moveDecodePromotionPiece(move)) +
      getPieceValue(moveDecodeCapturedPiece(move)) -
      getPieceValue(moveDecodePiece(move))
    );
  }

  if (moveFlag === MOVE_FLAG.CAPTURE) {
    return (
      CAPTURE_SCORE +
      getPieceValue(moveDecodeCapturedPiece(move)) -
      getPieceValue(moveDecodePiece(move))
    );
  }

  if (moveFlag === MOVE_FLAG.EN_PASSANT) {
    return EN_PASSANT_SCORE;
  }

  if (moveFlag === MOVE_FLAG.PROMOTION) {
    return PROMOTION_SCORE + getPieceValue(moveDecodePromotionPiece(move));
  }

  return 0;
};

export const orderMoves = (
  moveList: MoveList,
  movesCount: number,
  priorityMove: number | null = null,
): void => {
  const moves = moveList.moves;

  for (let i = 0; i < movesCount - 1; i++) {
    let bestIndex = i;
    let bestScore = scoreMove(moves[i], priorityMove);

    for (let j = i + 1; j < movesCount; j++) {
      const score = scoreMove(moves[j], priorityMove);

      if (score > bestScore) {
        bestScore = score;
        bestIndex = j;
      }
    }

    if (bestIndex !== i) {
      const currentMove = moves[i];
      moves[i] = moves[bestIndex];
      moves[bestIndex] = currentMove;
    }
  }
};
