/**
 * We do bitboard & (bitboard - 1n) to clear the least significant bit
 */

const hasExactlyOneBit = (bitboardLo: number, bitboardHi: number): boolean => {
  if (bitboardLo !== 0 && bitboardHi !== 0) {
    return false;
  }

  const bits = bitboardLo | bitboardHi;

  if (bits === 0) {
    return false;
  }

  return (bits & (bits - 1)) === 0;
};

export default hasExactlyOneBit;
