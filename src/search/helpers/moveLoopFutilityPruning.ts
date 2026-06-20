import { MOVE_FLAG } from "../../engine/constants/move";
import { moveDecodeFlag } from "../../engine/position/moves/packedMove";
import { CHECKMATE_SCORE } from "../constants/eval";
import {
  MOVE_LOOP_FUTILITY_MARGIN_BASE,
  MOVE_LOOP_FUTILITY_MARGIN_PER_DEPTH,
  MOVE_LOOP_FUTILITY_PRUNING_MATE_SCORE_BUFFER,
  MOVE_LOOP_FUTILITY_PRUNING_MAX_DEPTH,
  MOVE_LOOP_FUTILITY_PRUNING_MIN_MOVE_INDEX,
} from "../constants/moveLoopFutilityPruning";

const isMoveLoopFutilityPruningCandidate = (move: number): boolean => {
  const moveFlag = moveDecodeFlag(move);

  return moveFlag === MOVE_FLAG.QUIET || moveFlag === MOVE_FLAG.DOUBLE_PAWN_PUSH;
};

export const getMoveLoopFutilityPruningMargin = (depth: number): number =>
  MOVE_LOOP_FUTILITY_MARGIN_BASE +
  depth * MOVE_LOOP_FUTILITY_MARGIN_PER_DEPTH;

export const canUseMoveLoopFutilityPruning = (
  depth: number,
  alpha: number,
  isCheck: boolean,
  hasSearchedMove: boolean,
  moveIndex: number,
  move: number,
  isImportantMove: boolean,
): boolean => {
  if (
    isCheck ||
    !hasSearchedMove ||
    isImportantMove ||
    depth <= 0 ||
    depth > MOVE_LOOP_FUTILITY_PRUNING_MAX_DEPTH ||
    moveIndex < MOVE_LOOP_FUTILITY_PRUNING_MIN_MOVE_INDEX ||
    !Number.isFinite(alpha)
  ) {
    return false;
  }

  if (
    Math.abs(alpha) >=
    CHECKMATE_SCORE - MOVE_LOOP_FUTILITY_PRUNING_MATE_SCORE_BUFFER
  ) {
    return false;
  }

  return isMoveLoopFutilityPruningCandidate(move);
};

export const isMoveLoopFutilityPruned = (
  staticEval: number,
  alpha: number,
  depth: number,
): boolean => staticEval + getMoveLoopFutilityPruningMargin(depth) <= alpha;
