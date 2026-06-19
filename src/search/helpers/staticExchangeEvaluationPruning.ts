import { MOVE_FLAG } from "../../engine/constants/move";
import { moveDecodeFlag } from "../../engine/position/moves/packedMove";
import { CHECKMATE_SCORE } from "../constants/eval";
import {
  STATIC_EXCHANGE_EVALUATION_PRUNING_CAPTURE_MARGIN_PER_DEPTH,
  STATIC_EXCHANGE_EVALUATION_PRUNING_MATE_SCORE_BUFFER,
  STATIC_EXCHANGE_EVALUATION_PRUNING_MAX_DEPTH,
  STATIC_EXCHANGE_EVALUATION_PRUNING_MIN_MOVE_INDEX,
  STATIC_EXCHANGE_EVALUATION_PRUNING_QUIET_MARGIN_BASE,
  STATIC_EXCHANGE_EVALUATION_PRUNING_QUIET_MARGIN_PER_DEPTH,
} from "../constants/staticExchangeEvaluationPruning";

const isMoveOrderingStaticExchangeEvaluationMoveFlag = (
  moveFlag: number,
): boolean =>
  moveFlag === MOVE_FLAG.CAPTURE ||
  moveFlag === MOVE_FLAG.PROMOTION_CAPTURE ||
  moveFlag === MOVE_FLAG.EN_PASSANT ||
  moveFlag === MOVE_FLAG.PROMOTION;

const isStaticExchangeEvaluationPruningCandidateFlag = (
  moveFlag: number,
): boolean =>
  isMoveOrderingStaticExchangeEvaluationMoveFlag(moveFlag) ||
  moveFlag === MOVE_FLAG.QUIET ||
  moveFlag === MOVE_FLAG.DOUBLE_PAWN_PUSH;

export const hasMoveOrderingStaticExchangeEvaluationScore = (
  move: number,
): boolean => {
  const moveFlag = moveDecodeFlag(move);

  return isMoveOrderingStaticExchangeEvaluationMoveFlag(moveFlag);
};

export const getStaticExchangeEvaluationPruningThreshold = (
  move: number,
  depth: number,
): number => {
  const moveFlag = moveDecodeFlag(move);

  if (isMoveOrderingStaticExchangeEvaluationMoveFlag(moveFlag)) {
    return -(
      depth * STATIC_EXCHANGE_EVALUATION_PRUNING_CAPTURE_MARGIN_PER_DEPTH
    );
  }

  return -(
    STATIC_EXCHANGE_EVALUATION_PRUNING_QUIET_MARGIN_BASE +
    depth * STATIC_EXCHANGE_EVALUATION_PRUNING_QUIET_MARGIN_PER_DEPTH
  );
};

export const canUseStaticExchangeEvaluationPruning = (
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
    depth > STATIC_EXCHANGE_EVALUATION_PRUNING_MAX_DEPTH ||
    moveIndex < STATIC_EXCHANGE_EVALUATION_PRUNING_MIN_MOVE_INDEX ||
    !Number.isFinite(alpha)
  ) {
    return false;
  }

  if (
    Math.abs(alpha) >=
    CHECKMATE_SCORE - STATIC_EXCHANGE_EVALUATION_PRUNING_MATE_SCORE_BUFFER
  ) {
    return false;
  }

  return isStaticExchangeEvaluationPruningCandidateFlag(moveDecodeFlag(move));
};

export const isStaticExchangeEvaluationPruned = (
  move: number,
  staticExchangeEvaluationScore: number,
  depth: number,
): boolean =>
  staticExchangeEvaluationScore <
  getStaticExchangeEvaluationPruningThreshold(move, depth);
