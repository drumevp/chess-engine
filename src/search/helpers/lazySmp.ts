import os from "node:os";
import generateAttackInfo from "../../engine/movegen/attackInfo/main";
import generateLegalMovesFromContext from "../../engine/movegen/generateLegalMovesFromContext";
import getMoveGenerationContext from "../../engine/movegen/getMoveGenerationContext";
import { createMoveList } from "../../engine/movegen/moveList";
import type { Position } from "../../engine/types/position";
import {
  DEFAULT_LAZY_SMP_DEPTH_STAGGER,
  DEFAULT_LAZY_SMP_WORKER_COUNT,
  MAX_LAZY_SMP_WORKER_COUNT,
} from "../constants/lazySmp";
import {
  createMoveOrderingScratch,
  orderMoves,
  selectNextMove,
} from "./moveOrdering";
import type {
  LazySmpSearchOptions,
  LazySmpWorkerSearchResult,
  SerializedRepetitionCount,
} from "../types/lazySmp";

const clampWorkerCount = (workerCount: number): number => {
  if (!Number.isFinite(workerCount) || workerCount <= 1) {
    return 1;
  }

  if (workerCount >= MAX_LAZY_SMP_WORKER_COUNT) {
    return MAX_LAZY_SMP_WORKER_COUNT;
  }

  return Math.trunc(workerCount);
};

export const getLazySmpWorkerCount = (
  options: LazySmpSearchOptions,
): number => {
  if (options.workerCount !== undefined) {
    return clampWorkerCount(options.workerCount);
  }

  const availableParallelism = os.availableParallelism?.() ?? os.cpus().length;

  return clampWorkerCount(
    Math.min(DEFAULT_LAZY_SMP_WORKER_COUNT, availableParallelism),
  );
};

export const getLazySmpDepthStagger = (
  options: LazySmpSearchOptions,
): number => {
  if (options.depthStagger === undefined) {
    return DEFAULT_LAZY_SMP_DEPTH_STAGGER;
  }

  if (!Number.isFinite(options.depthStagger) || options.depthStagger <= 0) {
    return 0;
  }

  return Math.trunc(options.depthStagger);
};

export const serializeRepetitionCounts = (
  repetitionCounts: Map<bigint, number>,
): SerializedRepetitionCount[] =>
  Array.from(repetitionCounts, ([hash, count]) => [hash.toString(), count]);

export const deserializeRepetitionCounts = (
  repetitionCounts: SerializedRepetitionCount[],
): Map<bigint, number> =>
  new Map(repetitionCounts.map(([hash, count]) => [BigInt(hash), count]));

export const getLazySmpPriorityMoves = (
  position: Position,
  workerCount: number,
  useRootMovePriorities: boolean,
): number[] => {
  if (!useRootMovePriorities || workerCount <= 1) {
    return [];
  }

  const moveList = createMoveList();
  const ctx = getMoveGenerationContext(position, moveList);
  const attackInfo = generateAttackInfo(ctx);
  const movesCount = generateLegalMovesFromContext(ctx, attackInfo);

  if (movesCount === 0) {
    return [];
  }

  const moveOrderingScratch = createMoveOrderingScratch();
  orderMoves(position, moveList, movesCount, moveOrderingScratch);

  const priorityMoveCount = Math.min(workerCount, movesCount);
  const priorityMoves = new Array<number>(priorityMoveCount);

  for (let i = 0; i < priorityMoveCount; i++) {
    selectNextMove(moveList, movesCount, moveOrderingScratch, i);
    priorityMoves[i] = moveList.moves[i];
  }

  return priorityMoves;
};

export const getLazySmpWorkerDepth = (
  maxDepth: number,
  workerId: number,
  depthStagger: number,
): number => {
  if (maxDepth <= 0 || workerId === 0 || depthStagger === 0) {
    return maxDepth;
  }

  return maxDepth + (workerId % 2) * depthStagger;
};

export const selectLazySmpResult = (
  results: LazySmpWorkerSearchResult[],
): LazySmpWorkerSearchResult => {
  let bestResult = results[0];

  for (let i = 1; i < results.length; i++) {
    const result = results[i];

    if (result.depth > bestResult.depth) {
      bestResult = result;
      continue;
    }

    if (result.depth < bestResult.depth) {
      continue;
    }

    if (bestResult.stopped && !result.stopped) {
      bestResult = result;
      continue;
    }

    if (result.stopped !== bestResult.stopped) {
      continue;
    }

    if (result.nodes > bestResult.nodes) {
      bestResult = result;
    }
  }

  return bestResult;
};
