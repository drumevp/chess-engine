import { parentPort } from "node:worker_threads";
import generateFenToPosition from "../engine/fen/fenToPosition/generateFenToPosition";
import { deserializeRepetitionCounts } from "../search/helpers/lazySmp";
import iterativeDeepeningSearch from "../search/iterativeDeepeningSearch";
import lazySmpSearch from "../search/lazySmpSearch";
import { loadNnueModelFromPath } from "../search/nnue/defaultModel";
import { createNnueEvaluator } from "../search/nnue/inference";
import { createTranspositionTable } from "../search/transpositionTable/transpositionTable";
import type { SearchEvaluator } from "../search/types/nnue";
import type { TranspositionTable } from "../search/types/transpositionTable";
import type {
  UciSearchRequest,
  UciSearchWorkerCommand,
  UciSearchWorkerMessage,
} from "./searchProtocol";

if (parentPort === null) {
  throw new Error("UCI search worker must run inside a worker thread");
}

const port = parentPort;
let cachedEvaluatorPath: string | null = null;
let cachedNnueEvaluator: SearchEvaluator | null = null;
let transpositionTable: TranspositionTable | null = null;
let transpositionTableSize = 0;
let workQueue = Promise.resolve();

const postMessage = (message: UciSearchWorkerMessage): void => {
  port.postMessage(message);
};

const getEvaluator = async (request: UciSearchRequest): Promise<SearchEvaluator | undefined> => {
  if (request.evaluator === "simple") {
    return undefined;
  }

  const evaluatorPath = request.nnueModelPath ?? "default";

  if (
    cachedNnueEvaluator !== null &&
    cachedEvaluatorPath === evaluatorPath
  ) {
    return cachedNnueEvaluator;
  }

  cachedEvaluatorPath = evaluatorPath;
  cachedNnueEvaluator = createNnueEvaluator(
    await loadNnueModelFromPath(request.nnueModelPath),
  );

  return cachedNnueEvaluator;
};

const getTranspositionTable = (size: number): TranspositionTable => {
  if (transpositionTable === null || transpositionTableSize !== size) {
    transpositionTable = createTranspositionTable(size);
    transpositionTableSize = transpositionTable.size;
  }

  return transpositionTable;
};

const runSearch = async (request: UciSearchRequest): Promise<void> => {
  try {
    const startedAt = Date.now();
    const position = generateFenToPosition(request.fen);
    const repetitionCounts = deserializeRepetitionCounts(
      request.repetitionCounts,
    );
    const evaluatorName = request.nnueModelPath ?? "default";
    let hasReportedNnueLoaded = request.evaluator !== "nnue";

    if (request.evaluator === "nnue") {
      postMessage({
        type: "info",
        searchId: request.searchId,
        message: `loading NNUE model: ${evaluatorName}`,
      });
    }

    const evaluator = request.threads <= 1
      ? await getEvaluator(request)
      : undefined;
    const elapsedBeforeSearch = Date.now() - startedAt;
    const limits = request.limits.maxTimeMs === undefined
      ? request.limits
      : {
          ...request.limits,
          maxTimeMs: Math.max(
            1,
            request.limits.maxTimeMs - elapsedBeforeSearch,
          ),
        };

    if (request.evaluator === "nnue" && request.threads <= 1) {
      hasReportedNnueLoaded = true;
      postMessage({
        type: "info",
        searchId: request.searchId,
        message: `loaded NNUE model: ${evaluatorName}`,
      });
    }

    const reportIteration = (
      iteration: import("../search/types/search").IterativeDeepeningSearchResult,
    ): void => {
      if (!hasReportedNnueLoaded) {
        hasReportedNnueLoaded = true;
        postMessage({
          type: "info",
          searchId: request.searchId,
          message: `loaded NNUE model: ${evaluatorName}`,
        });
      }

      postMessage({
        type: "iteration",
        searchId: request.searchId,
        result: {
          ...iteration,
          elapsedTimeMs: Date.now() - startedAt,
        },
      });
    };
    const result =
      request.threads <= 1
        ? iterativeDeepeningSearch(
            position,
            repetitionCounts,
            request.maxDepth,
            limits,
            evaluator,
            null,
            getTranspositionTable(request.transpositionTableSize),
            reportIteration,
          )
        : await lazySmpSearch(
            position,
            repetitionCounts,
            request.maxDepth,
            limits,
            {
              workerCount: request.threads,
              depthStagger: 0,
              evaluatorType:
                request.evaluator === "nnue" ? "defaultNnue" : "simple",
              nnueModelPath: request.nnueModelPath,
              transpositionTableSize: request.transpositionTableSize,
              onIteration: reportIteration,
            },
          );

    if (!hasReportedNnueLoaded) {
      postMessage({
        type: "info",
        searchId: request.searchId,
        message: `loaded NNUE model: ${evaluatorName}`,
      });
    }

    postMessage({
      type: "result",
      searchId: request.searchId,
      result: {
        ...result,
        elapsedTimeMs: Date.now() - startedAt,
      },
    });
  } catch (error) {
    postMessage({
      type: "error",
      searchId: request.searchId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

port.on("message", (command: UciSearchWorkerCommand) => {
  workQueue = workQueue.then(async () => {
    if (command.type === "clearHash") {
      transpositionTable = null;
      transpositionTableSize = 0;

      return;
    }

    await runSearch(command.request);
  });
});
