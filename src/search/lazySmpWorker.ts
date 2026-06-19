import { parentPort, workerData } from "node:worker_threads";
import generateFenToPosition from "../engine/fen/fenToPosition/generateFenToPosition";
import iterativeDeepeningSearch from "./iterativeDeepeningSearch";
import { createDefaultNnueModel } from "./nnue/defaultModel";
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

const createLazySmpWorkerEvaluator = (
  evaluatorType: LazySmpEvaluatorType,
): SearchEvaluator | undefined => {
  if (evaluatorType === "defaultNnue") {
    return createNnueEvaluator(createDefaultNnueModel());
  }

  return undefined;
};

if (parentPort === null) {
  throw new Error("Lazy SMP worker must run inside a worker thread");
}

const data = workerData as LazySmpWorkerData;
const position = generateFenToPosition(data.fen);
const repetitionCounts = deserializeRepetitionCounts(data.repetitionCounts);
const transpositionTable =
  data.transpositionTable === undefined
    ? createTranspositionTable()
    : createTranspositionTableFromSharedBuffers(data.transpositionTable);
const result = iterativeDeepeningSearch(
  position,
  repetitionCounts,
  data.maxDepth,
  data.limits,
  createLazySmpWorkerEvaluator(data.evaluatorType),
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
