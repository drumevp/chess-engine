/**
 * We do bitboard & (bitboard - 1n) to clear the least significant bit
 */

import { Bitboard } from "../types/bitboard";

const hasExactlyOneBit = (bitboard: Bitboard): boolean => {
  return (bitboard !== 0n && (bitboard & (bitboard - 1n)) === 0n);
}

export default hasExactlyOneBit;