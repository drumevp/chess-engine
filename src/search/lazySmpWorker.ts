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

const main = async () => {
  const data = workerData as LazySmpWorkerData;
  const position = generateFenToPosition(data.fen);
  const repetitionCounts = deserializeRepetitionCounts(data.repetitionCounts);
  const transpositionTable =
    data.transpositionTable === undefined
      ? createTranspositionTable()
      : createTranspositionTableFromSharedBuffers(data.transpositionTable);
  const evaluator = await createLazySmpWorkerEvaluator(data.evaluatorType, data.nnueModelPath);
  const result = iterativeDeepeningSearch(
    position,
    repetitionCounts,
    data.maxDepth,
    data.limits,
    evaluator,
    data.priorityMove,
    transpositionTable,
  );
  const workerResult: LazySmpWorkerSearchResult = {
    ...result,
    workerId: data.workerId,
    requestedDepth: data.maxDepth,
    priorityMove: data.priorityMove,
  };

  parentPort.postMessage(workerResult);
};

main().catch((error) => {
  parentPort!.postMessage({
    workerId: (workerData as LazySmpWorkerData).workerId,
    bestMove: null,
    score: 0,
    pv: [],
    depth: 0,
    nodes: 0,
    elapsedTimeMs: 0,
    stopped: true,
    requestedDepth: 0,
    priorityMove: null,
  } satisfies LazySmpWorkerSearchResult);
});
