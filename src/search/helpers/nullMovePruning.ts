import { CHECKMATE_SCORE } from "../constants/eval";
import {
  NULL_MOVE_PRUNING_MATE_SCORE_BUFFER,
  NULL_MOVE_PRUNING_MIN_DEPTH,
  NULL_MOVE_REDUCTION_BASE,
  NULL_MOVE_REDUCTION_DEPTH_DIVISOR,
} from "../constants/nullMovePruning";
import { BISHOP_INDEX, KNIGHT_INDEX, QUEEN_INDEX, ROOK_INDEX } from "../../engine/constants/piece";
import type { Position } from "../../engine/types/position";
import calculatePieceIndex from "../../engine/helpers/calculatePieceIndex";

const hasNonPawnMaterialForSideToMove = (position: Position): boolean => {
  const color = position.color;

  for (const piece of [ROOK_INDEX, KNIGHT_INDEX, BISHOP_INDEX, QUEEN_INDEX]) {
    const pieceIndex = calculatePieceIndex(color, piece);

    if (position.stateLo[pieceIndex] !== 0 || position.stateHi[pieceIndex] !== 0) {
      return true;
    }
  }

  return false;
};

export const getNullMoveReduction = (depth: number): number =>
  NULL_MOVE_REDUCTION_BASE +
  Math.trunc(depth / NULL_MOVE_REDUCTION_DEPTH_DIVISOR);

export const canUseNullMovePruning = (
  position: Position,
  depth: number,
  beta: number,
  isCheck: boolean,
  isPreviousMoveNull: boolean,
  staticEval: number,
): boolean => {
  if (
    isCheck ||
    isPreviousMoveNull ||
    depth < NULL_MOVE_PRUNING_MIN_DEPTH ||
    staticEval < beta
  ) {
    return false;
  }

  if (Math.abs(beta) >= CHECKMATE_SCORE - NULL_MOVE_PRUNING_MATE_SCORE_BUFFER) {
    return false;
  }

  return hasNonPawnMaterialForSideToMove(position);
};
