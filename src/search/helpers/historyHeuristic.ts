import {
  moveDecodeColor,
  moveDecodeFrom,
  moveDecodeTo,
} from "../../engine/position/moves/packedMove";
import {
  HISTORY_HEURISTIC_COLOR_COUNT,
  HISTORY_HEURISTIC_MAX_SCORE,
  HISTORY_HEURISTIC_SQUARE_COUNT,
} from "../constants/historyHeuristic";
import { isKillerMoveCandidate } from "./killerMoves";
import type { HistoryHeuristic } from "../types/historyHeuristic";

const HISTORY_HEURISTIC_COLOR_OFFSET =
  HISTORY_HEURISTIC_SQUARE_COUNT * HISTORY_HEURISTIC_SQUARE_COUNT;

const getHistoryHeuristicIndex = (move: number): number =>
  moveDecodeColor(move) * HISTORY_HEURISTIC_COLOR_OFFSET +
  moveDecodeFrom(move) * HISTORY_HEURISTIC_SQUARE_COUNT +
  moveDecodeTo(move);

export const createHistoryHeuristic = (): HistoryHeuristic => ({
  scores: new Int32Array(
    HISTORY_HEURISTIC_COLOR_COUNT * HISTORY_HEURISTIC_COLOR_OFFSET,
  ),
});

export const getHistoryHeuristicScore = (
  historyHeuristic: HistoryHeuristic,
  move: number,
): number => historyHeuristic.scores[getHistoryHeuristicIndex(move)];

export const recordHistoryHeuristic = (
  historyHeuristic: HistoryHeuristic,
  move: number,
  depth: number,
): void => {
  if (!isKillerMoveCandidate(move)) {
    return;
  }

  const index = getHistoryHeuristicIndex(move);
  const bonus = depth * depth;
  const score = historyHeuristic.scores[index] + bonus;

  historyHeuristic.scores[index] =
    score > HISTORY_HEURISTIC_MAX_SCORE
      ? HISTORY_HEURISTIC_MAX_SCORE
      : score;
};
