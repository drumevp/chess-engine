import generateFenToPosition from "../../src/engine/fen/fenToPosition/generateFenToPosition";
import iterativeDeepeningSearch from "../../src/search/iterativeDeepeningSearch";
import {
  createNnueEvaluator,
  type NnueEvaluatorBackend,
} from "../../src/search/nnue/inference";
import { getNumberArg } from "./args";
import { loadNnueModel } from "./modelFiles";

const BENCHMARK_FENS = [
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "r1bq1rk1/ppp2ppp/2n2n2/2bp4/4P3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 4 7",
  "8/5pk1/6p1/3P4/4P3/5K2/8/8 w - - 0 40",
] as const;

const moveTimeMs = Math.max(1, getNumberArg("--movetime", 1_000));
const maxDepth = Math.max(1, getNumberArg("--max-depth", 128));
const model = await loadNnueModel("default");

for (const backend of ["typescript", "wasm"] as const satisfies readonly NnueEvaluatorBackend[]) {
  let nodes = 0;
  let elapsedMs = 0;
  let completedDepth = 0;

  for (const fen of BENCHMARK_FENS) {
    const position = generateFenToPosition(fen);
    const evaluator = createNnueEvaluator(model, { backend });
    const result = iterativeDeepeningSearch(
      position,
      new Map([[position.zobristHash, 1]]),
      maxDepth,
      { maxTimeMs: moveTimeMs },
      evaluator,
    );

    nodes += result.nodes;
    elapsedMs += result.elapsedTimeMs;
    completedDepth += result.depth;
  }

  console.log(
    JSON.stringify({
      backend,
      positions: BENCHMARK_FENS.length,
      moveTimeMs,
      nodes,
      elapsedMs,
      nodesPerSecond: Math.round(nodes / (elapsedMs / 1_000)),
      meanCompletedDepth: completedDepth / BENCHMARK_FENS.length,
    }),
  );
}
