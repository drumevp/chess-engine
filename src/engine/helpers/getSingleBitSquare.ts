const getSingleBitSquare = (bitboardLo: number, bitboardHi: number): number => {
  if (bitboardLo !== 0) {
    return 31 - Math.clz32(bitboardLo);
  }

  return 32 + 31 - Math.clz32(bitboardHi);
};

export default getSingleBitSquare;
