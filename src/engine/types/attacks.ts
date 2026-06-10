import { Bitboard } from "./bitboard";

export type GenerateAttacksFn = (square: number, occupancy: Bitboard) => Bitboard;