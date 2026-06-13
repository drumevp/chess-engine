import { Bitboard32 } from "./bitboard";

export type GenerateAttacksFn = (
  square: number,
  occupancyLo: number,
  occupancyHi: number,
  // This is better than having each function create object allocations
  out: Bitboard32,
) => void;
