import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import generateFenFromPosition from "../engine/fen/fenFromPosition/generateFenFromPosition";
import type { Position } from "../engine/types/position";
import {
  getLazySmpDepthStagger,
  getLazySmpPriorityMoves,
  getLazySmpWorkerCount,
  getLazySmpWorkerDepth,
  selectLazySmpResult,
  serializeRepetitionCounts,
} from "./helpers/lazySmp";
import {
  createSharedTranspositionTable,
  getSharedTranspositionTableBuffers,
} from "./transpositionTable/transpositionTable";
import type {
  LazySmpSearchOptions,
  LazySmpSearchResult,
  LazySmpWorkerData,
  LazySmpWorkerMessage,
  LazySmpWorkerSearchResult,
} from "./types/lazySmp";
import type { SearchLimits } from "./types/search";

const getLazySmpWorkerUrl = (): URL => {
  if (typeof import.meta.url === "string") {
    return new URL(
      import.meta.url.endsWith(".ts")
        ? "./lazySmpWorker.ts"
        : "./lazySmpWorker.js",
      import.meta.url,
    );
  }

  return pathToFileURL(resolvePath(__dirname, "lazySmpWorker.js"));
};

const runLazySmpWorker = (
  data: LazySmpWorkerData,
  onIteration?: (result: LazySmpWorkerSearchResult) => void,
): Promise<LazySmpWorkerSearchResult> =>
  new Promise((resolve, reject) => {
    const worker = new Worker(getLazySmpWorkerUrl(), {
      workerData: data,
    });

    worker.on("message", (message: LazySmpWorkerMessage) => {
      if (message.type === "iteration") {
        onIteration?.(message.result);
        return;
      }

      resolve(message.result);
    });
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Lazy SMP worker exited with code ${code}`));
      }
    });
  });

const getLazySmpWorkerLimits = (
  limits: SearchLimits,
  workerCount: number,
): SearchLimits => {
  if (limits.maxNodes === undefined || workerCount <= 1) {
    return limits;
  }

  return {
    ...limits,
    maxNodes: Math.max(1, Math.trunc(limits.maxNodes / workerCount)),
  };
};

const lazySmpSearch = async (
  position: Position,
  repetitionCounts: Map<bigint, number>,
  maxDepth: number,
  limits: SearchLimits = {},
  options: LazySmpSearchOptions = {},
): Promise<LazySmpSearchResult> => {
  const startedAt = Date.now();
  const workerCount = getLazySmpWorkerCount(options);
  const depthStagger = getLazySmpDepthStagger(options);
  const fen = generateFenFromPosition(position);
  const serializedRepetitionCounts = serializeRepetitionCounts(repetitionCounts);
  const workerLimits = getLazySmpWorkerLimits(limits, workerCount);
  const transpositionTableBuffers =
    options.useSharedTranspositionTable === false
      ? undefined
      : getSharedTranspositionTableBuffers(
          createSharedTranspositionTable(options.transpositionTableSize),
        );
  const priorityMoves = getLazySmpPriorityMoves(
    position,
    workerCount,
    options.useRootMovePriorities ?? true,
  );
  const workerPromises = new Array<Promise<LazySmpWorkerSearchResult>>(
    workerCount,
  );
  const latestWorkerResults = new Array<LazySmpWorkerSearchResult | null>(
    workerCount,
  ).fill(null);
  const emitIteration = (workerResult: LazySmpWorkerSearchResult): void => {
    latestWorkerResults[workerResult.workerId] = workerResult;
    const availableResults = latestWorkerResults.filter(
      (result): result is LazySmpWorkerSearchResult => result !== null,
    );
    const bestIteration = selectLazySmpResult(availableResults);
    let nodes = 0;
    let qNodes = 0;
    let selDepth = 0;
    let hashfull = 0;

    for (const result of availableResults) {
      nodes += result.nodes;
      qNodes += result.qNodes;
      selDepth = Math.max(selDepth, result.selDepth);
      hashfull = Math.max(hashfull, result.hashfull);
    }

    options.onIteration?.({
      bestMove: bestIteration.bestMove,
      score: bestIteration.score,
      pv: bestIteration.pv,
      depth: bestIteration.depth,
      selDepth,
      nodes,
      qNodes,
      hashfull,
      elapsedTimeMs: Date.now() - startedAt,
      stopped: false,
    });
  };

  for (let workerId = 0; workerId < workerCount; workerId++) {
    workerPromises[workerId] = runLazySmpWorker(
      {
        workerId,
        fen,
        repetitionCounts: serializedRepetitionCounts,
        maxDepth: getLazySmpWorkerDepth(maxDepth, workerId, depthStagger),
        limits: workerLimits,
        priorityMove:
          priorityMoves.length === 0
            ? null
            : priorityMoves[workerId % priorityMoves.length],
        evaluatorType: options.evaluatorType ?? "defaultNnue",
        nnueModelPath: options.nnueModelPath,
        transpositionTable: transpositionTableBuffers,
      },
      emitIteration,
    );
  }

  const workerResults = await Promise.all(workerPromises);
  const bestResult = selectLazySmpResult(workerResults);
  let nodes = 0;
  let qNodes = 0;
  let selDepth = 0;
  let hashfull = 0;

  for (let i = 0; i < workerResults.length; i++) {
    nodes += workerResults[i].nodes;
    qNodes += workerResults[i].qNodes;
    selDepth = Math.max(selDepth, workerResults[i].selDepth);
    hashfull = Math.max(hashfull, workerResults[i].hashfull);
  }

  return {
    bestMove: bestResult.bestMove,
    score: bestResult.score,
    pv: bestResult.pv,
    depth: bestResult.depth,
    selDepth,
    nodes,
    qNodes,
    hashfull,
    elapsedTimeMs: Date.now() - startedAt,
    stopped: workerResults.some((result) => result.stopped),
    workerCount,
    workerResults,
  };
};

export default lazySmpSearch;
