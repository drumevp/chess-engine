import {
  ASPIRATION_WINDOW_DELTA_GROWTH_FACTOR,
  ASPIRATION_WINDOW_INITIAL_DELTA,
  ASPIRATION_WINDOW_MATE_SCORE_THRESHOLD,
  ASPIRATION_WINDOW_MAX_DELTA,
  ASPIRATION_WINDOW_MIN_DEPTH,
} from "../constants/aspirationWindow";

export const shouldUseAspirationWindow = (
  depth: number,
  previousDepth: number,
  previousScore: number,
): boolean =>
  depth >= ASPIRATION_WINDOW_MIN_DEPTH &&
  previousDepth > 0 &&
  Math.abs(previousScore) < ASPIRATION_WINDOW_MATE_SCORE_THRESHOLD;

export const getInitialAspirationWindowDelta = (): number =>
  ASPIRATION_WINDOW_INITIAL_DELTA;

export const getNextAspirationWindowDelta = (delta: number): number =>
  Math.min(
    Math.ceil(delta * ASPIRATION_WINDOW_DELTA_GROWTH_FACTOR),
    ASPIRATION_WINDOW_MAX_DELTA,
  );

export const getAspirationWindowAlpha = (
  score: number,
  delta: number,
): number => (delta >= ASPIRATION_WINDOW_MAX_DELTA ? -Infinity : score - delta);

export const getAspirationWindowBeta = (
  score: number,
  delta: number,
): number => (delta >= ASPIRATION_WINDOW_MAX_DELTA ? Infinity : score + delta);

export const isAspirationWindowFailLow = (
  score: number,
  alpha: number,
): boolean => score <= alpha;

export const isAspirationWindowFailHigh = (
  score: number,
  beta: number,
): boolean => score >= beta;
