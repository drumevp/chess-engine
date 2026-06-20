import { Position } from "../engine/types/position";
import {
  createSearchControl,
  getSearchElapsedTimeMs,
} from "./helpers/search";
import {
  getAspirationWindowAlpha,
  getAspirationWindowBeta,
  getInitialAspirationWindowDelta,
  getNextAspirationWindowDelta,
  isAspirationWindowFailHigh,
  isAspirationWindowFailLow,
  shouldUseAspirationWindow,
} from "./helpers/aspirationWindow";
import { createCaptureHistory } from "./helpers/captureHistory";
import { createCorrectionHistory } from "./helpers/correctionHistory";
import { createHistoryHeuristic } from "./helpers/historyHeuristic";
import searchRoot from "./searchRoot/searchRoot";
import {
  SearchResult,
  IterativeDeepeningSearchResult,
  SearchLimits,
} from "./types/search";
import type { SearchEvaluator } from "./types/nnue";
import {
  createTranspositionTable,
} from "./transpositionTable/transpositionTable";
import type { TranspositionTable } from "./types/transpositionTable";

export type SearchIterationCallback = (
  result: IterativeDeepeningSearchResult,
) => void;

const iterativeDeepeningSearch = (
  position: Position,
  repetitionCounts: Map<bigint, number>,
  maxDepth: number,
  limits: SearchLimits = {},
  evaluator?: SearchEvaluator,
  initialPriorityMove: number | null = null,
  transpositionTable?: TranspositionTable,
  onIteration?: SearchIterationCallback,
): IterativeDeepeningSearchResult => {
  const control = createSearchControl(limits, evaluator);
  let bestResult: IterativeDeepeningSearchResult = {
    bestMove: null,
    score: 0,
    pv: [],
    depth: 0,
    nodes: 0,
    elapsedTimeMs: 0,
    stopped: false,
  };

  if (maxDepth <= 0) {
    const result = searchRoot(
      position,
      repetitionCounts,
      -Infinity,
      Infinity,
      0,
      control,
    );

    return {
      ...result,
      depth: 0,
      nodes: control.nodes,
      elapsedTimeMs: getSearchElapsedTimeMs(control),
      stopped: control.stopped,
    };
  }

  const searchTranspositionTable =
    transpositionTable ?? createTranspositionTable();
  const historyHeuristic = createHistoryHeuristic();
  const captureHistory = createCaptureHistory();
  const correctionHistory = createCorrectionHistory();

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (control.stopped) {
      break;
    }

    let result: SearchResult;

    if (
      shouldUseAspirationWindow(depth, bestResult.depth, bestResult.score)
    ) {
      let delta = getInitialAspirationWindowDelta();
      let alpha = getAspirationWindowAlpha(bestResult.score, delta);
      let beta = getAspirationWindowBeta(bestResult.score, delta);

      while (true) {
        result = searchRoot(
          position,
          repetitionCounts,
          alpha,
          beta,
          depth,
          control,
          bestResult.bestMove ?? initialPriorityMove,
          searchTranspositionTable,
          historyHeuristic,
          captureHistory,
          correctionHistory,
        );

        if (control.stopped) {
          break;
        }

        if (isAspirationWindowFailLow(result.score, alpha)) {
          delta = getNextAspirationWindowDelta(delta);
          alpha = getAspirationWindowAlpha(result.score, delta);
          beta = getAspirationWindowBeta(result.score, delta);
          continue;
        }

        if (isAspirationWindowFailHigh(result.score, beta)) {
          delta = getNextAspirationWindowDelta(delta);
          alpha = getAspirationWindowAlpha(result.score, delta);
          beta = getAspirationWindowBeta(result.score, delta);
          continue;
        }

        break;
      }
    } else {
      result = searchRoot(
        position,
        repetitionCounts,
        -Infinity,
        Infinity,
        depth,
        control,
        bestResult.bestMove ?? initialPriorityMove,
        searchTranspositionTable,
        historyHeuristic,
        captureHistory,
        correctionHistory,
      );
    }

    if (control.stopped) {
      if (bestResult.bestMove === null && result.bestMove !== null) {
        bestResult = {
          ...result,
          depth: Math.max(0, depth - 1),
          nodes: control.nodes,
          elapsedTimeMs: getSearchElapsedTimeMs(control),
          stopped: true,
        };
      }

      break;
    }

    bestResult = {
      ...result,
      depth,
      nodes: control.nodes,
      elapsedTimeMs: getSearchElapsedTimeMs(control),
      stopped: false,
    };
    onIteration?.(bestResult);
  }

  return {
    ...bestResult,
    nodes: control.nodes,
    elapsedTimeMs: getSearchElapsedTimeMs(control),
    stopped: control.stopped,
  };
};

export default iterativeDeepeningSearch;
