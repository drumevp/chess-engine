import {
  DEFAULT_TRANSPOSITION_TABLE_SIZE,
  TRANSPOSITION_TABLE_BOUND,
  TRANSPOSITION_TABLE_MATE_SCORE_THRESHOLD,
} from "../constants/transpositionTable";
import {
  SharedTranspositionTableBuffers,
  TranspositionTable,
  TranspositionTableBound,
  TranspositionTableEntry,
} from "../types/transpositionTable";

const TRANSPOSITION_TABLE_STALE_GENERATIONS = 4;

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
    generation: 0,
    occupied: new Uint8Array(tableSize),
    generations: new Uint8Array(tableSize),
    keys: new BigUint64Array(tableSize),
    depths: new Int16Array(tableSize),
    scores: new Int32Array(tableSize),
    bounds: new Uint8Array(tableSize),
    bestMoves: new Uint32Array(tableSize),
    hasBestMove: new Uint8Array(tableSize),
  };
};

export const createSharedTranspositionTable = (
  size = DEFAULT_TRANSPOSITION_TABLE_SIZE,
): TranspositionTable => {
  const tableSize = getPowerOfTwoTableSize(size);

  return {
    size: tableSize,
    keyMask: BigInt(tableSize - 1),
    generation: 0,
    occupied: new Uint8Array(new SharedArrayBuffer(tableSize)),
    generations: new Uint8Array(new SharedArrayBuffer(tableSize)),
    keys: new BigUint64Array(new SharedArrayBuffer(tableSize * 8)),
    depths: new Int16Array(new SharedArrayBuffer(tableSize * 2)),
    scores: new Int32Array(new SharedArrayBuffer(tableSize * 4)),
    bounds: new Uint8Array(new SharedArrayBuffer(tableSize)),
    bestMoves: new Uint32Array(new SharedArrayBuffer(tableSize * 4)),
    hasBestMove: new Uint8Array(new SharedArrayBuffer(tableSize)),
  };
};

export const getSharedTranspositionTableBuffers = (
  transpositionTable: TranspositionTable,
): SharedTranspositionTableBuffers => ({
  size: transpositionTable.size,
  occupied: transpositionTable.occupied.buffer as SharedArrayBuffer,
  generations: transpositionTable.generations.buffer as SharedArrayBuffer,
  keys: transpositionTable.keys.buffer as SharedArrayBuffer,
  depths: transpositionTable.depths.buffer as SharedArrayBuffer,
  scores: transpositionTable.scores.buffer as SharedArrayBuffer,
  bounds: transpositionTable.bounds.buffer as SharedArrayBuffer,
  bestMoves: transpositionTable.bestMoves.buffer as SharedArrayBuffer,
  hasBestMove: transpositionTable.hasBestMove.buffer as SharedArrayBuffer,
});

export const createTranspositionTableFromSharedBuffers = (
  buffers: SharedTranspositionTableBuffers,
): TranspositionTable => ({
  size: buffers.size,
  keyMask: BigInt(buffers.size - 1),
  generation: 0,
  occupied: new Uint8Array(buffers.occupied),
  generations: new Uint8Array(buffers.generations),
  keys: new BigUint64Array(buffers.keys),
  depths: new Int16Array(buffers.depths),
  scores: new Int32Array(buffers.scores),
  bounds: new Uint8Array(buffers.bounds),
  bestMoves: new Uint32Array(buffers.bestMoves),
  hasBestMove: new Uint8Array(buffers.hasBestMove),
});

export const advanceTranspositionTableGeneration = (
  transpositionTable: TranspositionTable,
): void => {
  const nextGeneration = (transpositionTable.generation + 1) & 0xff;

  if (nextGeneration === 0) {
    transpositionTable.occupied.fill(0);
    transpositionTable.generations.fill(0);
  }

  transpositionTable.generation = nextGeneration;
};

export const getTranspositionTableHashfull = (
  transpositionTable: TranspositionTable,
): number => {
  const sampleSize = Math.min(1_000, transpositionTable.size);
  let occupied = 0;

  for (let i = 0; i < sampleSize; i++) {
    occupied += Number(
      transpositionTable.occupied[i] !== 0 &&
        transpositionTable.generations[i] === transpositionTable.generation,
    );
  }

  return sampleSize === 0 ? 0 : Math.trunc((occupied * 1_000) / sampleSize);
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

  transpositionTable.generations[index] = transpositionTable.generation;

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

export const getTranspositionTableBestMove = (
  transpositionTable: TranspositionTable,
  hash: bigint,
): number | null => {
  const index = getTranspositionTableIndex(transpositionTable, hash);

  if (
    transpositionTable.occupied[index] === 0 ||
    transpositionTable.keys[index] !== hash ||
    transpositionTable.hasBestMove[index] === 0
  ) {
    return null;
  }

  transpositionTable.generations[index] = transpositionTable.generation;

  return transpositionTable.bestMoves[index];
};

export const getTranspositionTableEntry = (
  transpositionTable: TranspositionTable,
  hash: bigint,
  ply: number,
): TranspositionTableEntry | null => {
  const index = getTranspositionTableIndex(transpositionTable, hash);

  if (
    transpositionTable.occupied[index] === 0 ||
    transpositionTable.keys[index] !== hash
  ) {
    return null;
  }

  transpositionTable.generations[index] = transpositionTable.generation;

  return {
    depth: transpositionTable.depths[index],
    score: getProbedScore(transpositionTable.scores[index], ply),
    bound: transpositionTable.bounds[index] as TranspositionTableBound,
    bestMove:
      transpositionTable.hasBestMove[index] === 0
        ? null
        : transpositionTable.bestMoves[index],
  };
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
  const isSameKey =
    transpositionTable.occupied[index] !== 0 &&
    transpositionTable.keys[index] === hash;
  const age =
    (transpositionTable.generation - transpositionTable.generations[index]) &
    0xff;

  if (
    transpositionTable.occupied[index] !== 0 &&
    transpositionTable.depths[index] > depth &&
    (isSameKey || age < TRANSPOSITION_TABLE_STALE_GENERATIONS)
  ) {
    if (isSameKey) {
      transpositionTable.generations[index] = transpositionTable.generation;
    }

    return;
  }

  transpositionTable.occupied[index] = 1;
  transpositionTable.generations[index] = transpositionTable.generation;
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
