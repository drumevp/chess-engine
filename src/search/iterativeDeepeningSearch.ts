import { Position } from "../engine/types/position";
import searchRoot from "./searchRoot/searchRoot";
import { IterativeDeepeningSearchResult } from "./types/search";

const iterativeDeepeningSearch = (
  position: Position,
  repetitionCounts: Map<bigint, number>,
  maxDepth: number,
): IterativeDeepeningSearchResult => {
  let bestResult: IterativeDeepeningSearchResult = {
    bestMove: null,
    score: 0,
    depth: 0,
  };

  if (maxDepth <= 0) {
    const result = searchRoot(
      position,
      repetitionCounts,
      -Infinity,
      Infinity,
      0,
    );

    return {
      ...result,
      depth: 0,
    };
  }

  for (let depth = 1; depth <= maxDepth; depth++) {
    const result = searchRoot(
      position,
      repetitionCounts,
      -Infinity,
      Infinity,
      depth,
    );

    bestResult = {
      ...result,
      depth,
    };
  }

  return bestResult;
};

export default iterativeDeepeningSearch;
