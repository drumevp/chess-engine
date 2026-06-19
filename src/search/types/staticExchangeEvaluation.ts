import { Bitboard32 } from "../../engine/types/bitboard";

export type StaticExchangeEvaluationScratch = {
  stateLo: Uint32Array;
  stateHi: Uint32Array;
  gain: Int32Array;
  attackScratch: Bitboard32;
  simulatedAllOccupancyLo: number;
  simulatedAllOccupancyHi: number;
  attackersLo: number;
  attackersHi: number;
  attackerPiece: number;
  attackerSquare: number;
  attackerStateIndex: number;
};
