import {
  DEFAULT_TRANSPOSITION_TABLE_SIZE,
  TRANSPOSITION_TABLE_BOUND,
  TRANSPOSITION_TABLE_MATE_SCORE_THRESHOLD,
} from "../constants/transpositionTable";
import {
  TranspositionTable,
  TranspositionTableBound,
} from "../types/transpositionTable";

const getPowerOfTwoTableSize = (size: number): number => {
  if (!Number.isFinite(size) || size <= 1) {
    return DEFAULT_TRANSPOSITION_TABLE_SIZE;
  }

  let tableSize = 1;

  while (tableSize < size) {
    tableSize *= 2;
  }

  return tableSize;
};

const getTranspositionTableIndex = (
  transpositionTable: TranspositionTable,
  hash: bigint,
): number => Number(hash & transpositionTable.keyMask);

const getStoredScore = (score: number, ply: number): number => {
  if (score >= TRANSPOSITION_TABLE_MATE_SCORE_THRESHOLD) {
    return score + ply;
  }

  if (score <= -TRANSPOSITION_TABLE_MATE_SCORE_THRESHOLD) {
    return score - ply;
  }

  return score;
};

const getProbedScore = (score: number, ply: number): number => {
  if (score >= TRANSPOSITION_TABLE_MATE_SCORE_THRESHOLD) {
    return score - ply;
  }

  if (score <= -TRANSPOSITION_TABLE_MATE_SCORE_THRESHOLD) {
    return score + ply;
  }

  return score;
};

export const createTranspositionTable = (
  size = DEFAULT_TRANSPOSITION_TABLE_SIZE,
): TranspositionTable => {
  const tableSize = getPowerOfTwoTableSize(size);

  return {
    size: tableSize,
    keyMask: BigInt(tableSize - 1),
    occupied: new Uint8Array(tableSize),
    keys: new BigUint64Array(tableSize),
    depths: new Int16Array(tableSize),
    scores: new Int32Array(tableSize),
    bounds: new Uint8Array(tableSize),
    bestMoves: new Uint32Array(tableSize),
    hasBestMove: new Uint8Array(tableSize),
  };
};

export const probeTranspositionTable = (
  transpositionTable: TranspositionTable,
  hash: bigint,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
): number | null => {
  const index = getTranspositionTableIndex(transpositionTable, hash);

  if (
    transpositionTable.occupied[index] === 0 ||
    transpositionTable.keys[index] !== hash ||
    transpositionTable.depths[index] < depth
  ) {
    return null;
  }

  const score = getProbedScore(transpositionTable.scores[index], ply);
  const bound = transpositionTable.bounds[index];

  if (bound === TRANSPOSITION_TABLE_BOUND.EXACT) {
    return score;
  }

  if (bound === TRANSPOSITION_TABLE_BOUND.LOWER_BOUND && score >= beta) {
    return score;
  }

  if (bound === TRANSPOSITION_TABLE_BOUND.UPPER_BOUND && score <= alpha) {
    return score;
  }

  return null;
};

export const storeTranspositionTable = (
  transpositionTable: TranspositionTable,
  hash: bigint,
  depth: number,
  score: number,
  bound: TranspositionTableBound,
  bestMove: number | null,
  ply: number,
): void => {
  const index = getTranspositionTableIndex(transpositionTable, hash);

  if (
    transpositionTable.occupied[index] !== 0 &&
    transpositionTable.depths[index] > depth
  ) {
    return;
  }

  transpositionTable.occupied[index] = 1;
  transpositionTable.keys[index] = hash;
  transpositionTable.depths[index] = depth;
  transpositionTable.scores[index] = getStoredScore(score, ply);
  transpositionTable.bounds[index] = bound;

  if (bestMove === null) {
    transpositionTable.bestMoves[index] = 0;
    transpositionTable.hasBestMove[index] = 0;

    return;
  }

  transpositionTable.bestMoves[index] = bestMove;
  transpositionTable.hasBestMove[index] = 1;
};
