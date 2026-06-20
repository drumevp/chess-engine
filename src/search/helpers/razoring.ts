import { CHECKMATE_SCORE } from "../constants/eval";
import {
  RAZORING_MARGIN_BASE,
  RAZORING_MARGIN_PER_DEPTH,
  RAZORING_MATE_SCORE_BUFFER,
  RAZORING_MAX_DEPTH,
} from "../constants/razoring";

export const getRazoringMargin = (depth: number): number =>
  RAZORING_MARGIN_BASE + depth * RAZORING_MARGIN_PER_DEPTH;

export const canUseRazoring = (
  depth: number,
  alpha: number,
  beta: number,
  isCheck: boolean,
): boolean => {
  if (
    isCheck ||
    depth <= 0 ||
    depth > RAZORING_MAX_DEPTH ||
    !Number.isFinite(alpha) ||
    !Number.isFinite(beta)
  ) {
    return false;
  }

  return Math.abs(alpha) < CHECKMATE_SCORE - RAZORING_MATE_SCORE_BUFFER;
};

export const isRazoringCandidate = (
  staticEval: number,
  alpha: number,
  depth: number,
): boolean => staticEval + getRazoringMargin(depth) <= alpha;
