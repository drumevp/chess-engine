export const countRelevantBits = (bitboard: bigint): number => {
  let relevantBitCount = 0;

  // Remove 1s until the bitboard is empty
  while(bitboard !== 0n) {
    bitboard = bitboard & (bitboard - 1n);
    relevantBitCount ++;
  }

  return relevantBitCount;
}

export default countRelevantBits;