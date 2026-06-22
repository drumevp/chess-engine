import { TRANSPOSITION_TABLE_BOUND } from "../constants/transpositionTable";

export type TranspositionTableBound =
  (typeof TRANSPOSITION_TABLE_BOUND)[keyof typeof TRANSPOSITION_TABLE_BOUND];

export type TranspositionTable = {
  size: number;
  keyMask: bigint;
  generation: number;
  occupied: Uint8Array;
  generations: Uint8Array;
  keys: BigUint64Array;
  depths: Int16Array;
  scores: Int32Array;
  bounds: Uint8Array;
  bestMoves: Uint32Array;
  hasBestMove: Uint8Array;
};

export type TranspositionTableEntry = {
  depth: number;
  score: number;
  bound: TranspositionTableBound;
  bestMove: number | null;
};

export type SharedTranspositionTableBuffers = {
  size: number;
  occupied: SharedArrayBuffer;
  generations: SharedArrayBuffer;
  keys: SharedArrayBuffer;
  depths: SharedArrayBuffer;
  scores: SharedArrayBuffer;
  bounds: SharedArrayBuffer;
  bestMoves: SharedArrayBuffer;
  hasBestMove: SharedArrayBuffer;
};
