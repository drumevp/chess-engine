import { CHECKMATE_SCORE } from "../constants/eval";
import {
  REVERSE_FUTILITY_MARGIN_BASE,
  REVERSE_FUTILITY_MARGIN_PER_DEPTH,
  REVERSE_FUTILITY_MATE_SCORE_BUFFER,
  REVERSE_FUTILITY_PRUNING_MAX_DEPTH,
} from "../constants/reverseFutilityPruning";

export const getReverseFutilityPruningMargin = (depth: number): number =>
  REVERSE_FUTILITY_MARGIN_BASE + depth * REVERSE_FUTILITY_MARGIN_PER_DEPTH;

export const canUseReverseFutilityPruning = (
  depth: number,
  beta: number,
  isCheck: boolean,
): boolean => {
  if (
    isCheck ||
    depth <= 0 ||
    depth > REVERSE_FUTILITY_PRUNING_MAX_DEPTH
  ) {
    return false;
  }

  return Math.abs(beta) < CHECKMATE_SCORE - REVERSE_FUTILITY_MATE_SCORE_BUFFER;
};

export const isReverseFutilityPruned = (
  staticEval: number,
  beta: number,
  depth: number,
): boolean => staticEval - getReverseFutilityPruningMargin(depth) >= beta;
