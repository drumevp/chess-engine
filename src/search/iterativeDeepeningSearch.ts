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
import { createHistoryHeuristic } from "./helpers/historyHeuristic";
import searchRoot from "./searchRoot/searchRoot";
import {
  SearchResult,
  IterativeDeepeningSearchResult,
  SearchLimits,
} from "./types/search";
import { createTranspositionTable } from "./transpositionTable/transpositionTable";

const iterativeDeepeningSearch = (
  position: Position,
  repetitionCounts: Map<bigint, number>,
  maxDepth: number,
  limits: SearchLimits = {},
): IterativeDeepeningSearchResult => {
  const control = createSearchControl(limits);
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

  const transpositionTable = createTranspositionTable();
  const historyHeuristic = createHistoryHeuristic();

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
          bestResult.bestMove,
          transpositionTable,
          historyHeuristic,
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
        bestResult.bestMove,
        transpositionTable,
        historyHeuristic,
      );
    }

    if (control.stopped) {
      break;
    }

    bestResult = {
      ...result,
      depth,
      nodes: control.nodes,
      elapsedTimeMs: getSearchElapsedTimeMs(control),
      stopped: false,
    };
  }

  return {
    ...bestResult,
    nodes: control.nodes,
    elapsedTimeMs: getSearchElapsedTimeMs(control),
    stopped: control.stopped,
  };
};

export default iterativeDeepeningSearch;
