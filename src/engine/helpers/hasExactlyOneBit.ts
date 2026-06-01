/**
 * We do bitboard & (bitboard - 1n) to clear the least significant bit
 */

const hasExactlyOneBit = (bitboard: bigint): boolean => {
  return (bitboard !== 0n && (bitboard & (bitboard - 1n)) === 0n);
}

export default hasExactlyOneBit;