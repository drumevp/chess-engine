export const getCurrentFile = (position: number): number => {
  return position % 8;
}

export const getCurrentRank = (position: number): number => {
  return Math.floor(position / 8);
}

export const getCurrentIndex = (rank: number, file: number): number => {
  return rank * 8 + file;
}

export const countRelevantBits = (bitboard: bigint): number => {
  let relevantBitCount = 0;

  // Remove 1s until the bitboard is empty
  while(bitboard !== 0n) {
    bitboard = bitboard & (bitboard - 1n);
    relevantBitCount ++;
  }

  return relevantBitCount;
}

export const random64bit = (): bigint => {
  const array = new Uint32Array(2);
  crypto.getRandomValues(array);

  return (BigInt(array[0]) << 32n) | BigInt(array[1]);
}

// Sparsing out the 1s in the value
export const getMagicNumberCandidate = (): bigint => {
  return random64bit() & random64bit() & random64bit();
}