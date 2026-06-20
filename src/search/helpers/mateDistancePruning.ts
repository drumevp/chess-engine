import { CHECKMATE_SCORE } from "../constants/eval";

export const getMateDistancePrunedAlpha = (
  alpha: number,
  ply: number,
): number => Math.max(alpha, -CHECKMATE_SCORE + ply);

export const getMateDistancePrunedBeta = (
  beta: number,
  ply: number,
): number => Math.min(beta, CHECKMATE_SCORE - ply);

export const isMateDistancePruned = (
  alpha: number,
  beta: number,
): boolean => alpha >= beta;
