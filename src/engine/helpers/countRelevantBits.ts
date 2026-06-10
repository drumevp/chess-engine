import { Bitboard } from "../types/bitboard";

export const countRelevantBits = (bitboard: Bitboard): number => {
  let relevantBitCount = 0;
  let bb = bitboard;

  // Remove 1s until the bitboard is empty
  while(bb !== 0n) {
    bb = bb & (bb - 1n);
    relevantBitCount ++;
  }

  return relevantBitCount;
}

export default countRelevantBits;