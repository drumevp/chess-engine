import { MOVE_FLAG } from "../../engine/constants/move";
import { moveDecodeFlag } from "../../engine/position/moves/packedMove";
import {
  LATE_MOVE_REDUCTION_BASE,
  LATE_MOVE_REDUCTION_DEPTH_DIVISOR,
  LATE_MOVE_REDUCTION_MIN_DEPTH,
  LATE_MOVE_REDUCTION_MIN_MOVE_INDEX,
  LATE_MOVE_REDUCTION_MOVE_INDEX_DIVISOR,
} from "../constants/lateMoveReduction";

const isLateMoveReductionCandidate = (move: number): boolean => {
  const moveFlag = moveDecodeFlag(move);

  return moveFlag === MOVE_FLAG.QUIET || moveFlag === MOVE_FLAG.DOUBLE_PAWN_PUSH;
};

export const canUseLateMoveReduction = (
  depth: number,
  moveIndex: number,
  isCheck: boolean,
  move: number,
): boolean =>
  !isCheck &&
  depth >= LATE_MOVE_REDUCTION_MIN_DEPTH &&
  moveIndex >= LATE_MOVE_REDUCTION_MIN_MOVE_INDEX &&
  isLateMoveReductionCandidate(move);

export const getLateMoveReduction = (
  depth: number,
  moveIndex: number,
): number =>
  LATE_MOVE_REDUCTION_BASE +
  Math.trunc(depth / LATE_MOVE_REDUCTION_DEPTH_DIVISOR) +
  Math.trunc(moveIndex / LATE_MOVE_REDUCTION_MOVE_INDEX_DIVISOR);
