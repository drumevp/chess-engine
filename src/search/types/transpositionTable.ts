import { TRANSPOSITION_TABLE_BOUND } from "../constants/transpositionTable";

export type TranspositionTableBound =
  (typeof TRANSPOSITION_TABLE_BOUND)[keyof typeof TRANSPOSITION_TABLE_BOUND];

export type TranspositionTable = {
  size: number;
  keyMask: bigint;
  occupied: Uint8Array;
  keys: BigUint64Array;
  depths: Int16Array;
  scores: Int32Array;
  bounds: Uint8Array;
  bestMoves: Uint32Array;
  hasBestMove: Uint8Array;
};
