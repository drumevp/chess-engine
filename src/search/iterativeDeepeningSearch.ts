import { Position } from "../engine/types/position";
import {
  createSearchControl,
  getSearchElapsedTimeMs,
} from "./helpers/search";
import searchRoot from "./searchRoot/searchRoot";
import {
  IterativeDeepeningSearchResult,
  SearchLimits,
} from "./types/search";

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

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (control.stopped) {
      break;
    }

    const result = searchRoot(
      position,
      repetitionCounts,
      -Infinity,
      Infinity,
      depth,
      control,
    );

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
