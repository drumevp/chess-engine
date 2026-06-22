import { parentPort, workerData } from "node:worker_threads";
import generateFenToPosition from "../engine/fen/fenToPosition/generateFenToPosition";
import iterativeDeepeningSearch from "./iterativeDeepeningSearch";
import { loadNnueModelFromPath } from "./nnue/defaultModel";
import { createNnueEvaluator } from "./nnue/inference";
import { deserializeRepetitionCounts } from "./helpers/lazySmp";
import {
  createTranspositionTable,
  createTranspositionTableFromSharedBuffers,
} from "./transpositionTable/transpositionTable";
import type {
  LazySmpEvaluatorType,
  LazySmpWorkerData,
  LazySmpWorkerMessage,
  LazySmpWorkerSearchResult,
} from "./types/lazySmp";
import type { SearchEvaluator } from "./types/nnue";

const createLazySmpWorkerEvaluator = async (
  evaluatorType: LazySmpEvaluatorType,
  nnueModelPath?: string,
): Promise<SearchEvaluator | undefined> => {
  if (evaluatorType === "defaultNnue") {
    return createNnueEvaluator(await loadNnueModelFromPath(nnueModelPath));
  }

  return undefined;
};

if (parentPort === null) {
  throw new Error("Lazy SMP worker must run inside a worker thread");
}

const port = parentPort;

const main = async () => {
  const startedAt = Date.now();
  const data = workerData as LazySmpWorkerData;
  const position = generateFenToPosition(data.fen);
  const repetitionCounts = deserializeRepetitionCounts(data.repetitionCounts);
  const transpositionTable =
    data.transpositionTable === undefined
      ? createTranspositionTable()
      : createTranspositionTableFromSharedBuffers(data.transpositionTable);
  const evaluator = await createLazySmpWorkerEvaluator(data.evaluatorType, data.nnueModelPath);
  const elapsedBeforeSearch = Date.now() - startedAt;
  const limits = data.limits.maxTimeMs === undefined
    ? data.limits
    : {
        ...data.limits,
        maxTimeMs: Math.max(1, data.limits.maxTimeMs - elapsedBeforeSearch),
      };
  const toWorkerResult = (
    result: import("./types/search").IterativeDeepeningSearchResult,
  ): LazySmpWorkerSearchResult => ({
    ...result,
    workerId: data.workerId,
    requestedDepth: data.maxDepth,
    priorityMove: data.priorityMove,
  });
  const result = iterativeDeepeningSearch(
    position,
    repetitionCounts,
    data.maxDepth,
    limits,
    evaluator,
    data.priorityMove,
    transpositionTable,
    (iteration) => {
      port.postMessage({
        type: "iteration",
        result: toWorkerResult(iteration),
      } satisfies LazySmpWorkerMessage);
    },
  );

  port.postMessage({
    type: "result",
    result: toWorkerResult(result),
  } satisfies LazySmpWorkerMessage);
};

main().catch(() => {
  port.postMessage({
    type: "result",
    result: {
      workerId: (workerData as LazySmpWorkerData).workerId,
      bestMove: null,
      score: 0,
      pv: [],
      depth: 0,
      selDepth: 0,
      nodes: 0,
      qNodes: 0,
      hashfull: 0,
      elapsedTimeMs: 0,
      stopped: true,
      requestedDepth: 0,
      priorityMove: null,
    },
  } satisfies LazySmpWorkerMessage);
});
