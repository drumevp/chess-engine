import {
  DEFAULT_FIND_BEST_MOVE_DEPTH,
  DEFAULT_FIND_BEST_MOVE_EVALUATOR,
  DEFAULT_FIND_BEST_MOVE_THREADS,
  MAX_FIND_BEST_MOVE_DEPTH,
} from "../../../constants/findBestMove";
import { MAX_LAZY_SMP_WORKER_COUNT } from "../../../../search/constants/lazySmp";
import type {
  ChessEngineEvaluator,
  FindBestMoveOptions,
} from "../../../types/findBestMove";

export type NormalizedFindBestMoveOptions = {
  depth: number;
  moveTimeMs?: number;
  nodes?: number;
  threads: number;
  evaluator: ChessEngineEvaluator;
  nnueModelPath?: string;
  nnueModelUrl?: string;
};

const getPositiveIntegerOption = (
  value: number | undefined,
  fallback: number,
  name: string,
  max = Number.MAX_SAFE_INTEGER,
): number => {
  const resolvedValue = value ?? fallback;

  if (
    !Number.isInteger(resolvedValue) ||
    resolvedValue < 1 ||
    resolvedValue > max
  ) {
    throw new Error(`${name} must be an integer from 1 to ${max}`);
  }

  return resolvedValue;
};

const getPositiveOption = (
  value: number | undefined,
  name: string,
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be greater than 0`);
  }

  return value;
};

const normalizeNnueModelPath = async (path?: string): Promise<string | undefined> => {
  if (path === undefined) return undefined;
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      const { resolve } = await import("node:path");
      return resolve(path);
    } catch {
    }
  }
  return path;
};

const normalizeFindBestMoveOptions = async (
  options: FindBestMoveOptions,
): Promise<NormalizedFindBestMoveOptions> => {
  const evaluator =
    options.evaluator ?? DEFAULT_FIND_BEST_MOVE_EVALUATOR;

  if (evaluator !== "simple" && evaluator !== "nnue") {
    throw new Error('evaluator must be either "simple" or "nnue"');
  }

  return {
    depth: getPositiveIntegerOption(
      options.depth,
      DEFAULT_FIND_BEST_MOVE_DEPTH,
      "depth",
      MAX_FIND_BEST_MOVE_DEPTH,
    ),
    moveTimeMs: getPositiveOption(options.moveTimeMs, "moveTimeMs"),
    nodes:
      options.nodes === undefined
        ? undefined
        : getPositiveIntegerOption(options.nodes, 1, "nodes"),
    threads: getPositiveIntegerOption(
      options.threads,
      DEFAULT_FIND_BEST_MOVE_THREADS,
      "threads",
      MAX_LAZY_SMP_WORKER_COUNT,
    ),
    evaluator,
    nnueModelPath: await normalizeNnueModelPath(options.nnueModelPath),
    nnueModelUrl: options.nnueModelUrl,
  };
};

export default normalizeFindBestMoveOptions;
