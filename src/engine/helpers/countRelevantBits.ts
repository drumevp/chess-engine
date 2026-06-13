export const countRelevantBits = (
  bitboardLo: number,
  bitboardHi: number,
): number => {
  let relevantBitCount = 0;
  let bbLo = bitboardLo;
  let bbHi = bitboardHi;

  // Remove 1s until the bitboard is empty
  while (bbLo !== 0) {
    bbLo = (bbLo & (bbLo - 1)) >>> 0;
    relevantBitCount++;
  }

  while (bbHi !== 0) {
    bbHi = (bbHi & (bbHi - 1)) >>> 0;
    relevantBitCount++;
  }

  return relevantBitCount;
};

export default countRelevantBits;
