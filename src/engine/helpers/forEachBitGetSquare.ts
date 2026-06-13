/**
 * Loops through each set bit in a bitboard, lowest square first.
 * Calls callback with square index 0-63.
 */

const forEachBitGetSquare = (
  bitboardLo: number,
  bitboardHi: number,
  callback: (square: number) => void,
) => {
  let bitsLo = Number(bitboardLo);

  while (bitsLo !== 0) {
    const lsb = bitsLo & -bitsLo;
    callback(31 - Math.clz32(lsb));
    bitsLo = (bitsLo & (bitsLo - 1)) >>> 0;
  }

  let bitsHi = Number(bitboardHi);

  while (bitsHi !== 0) {
    const lsb = bitsHi & -bitsHi;
    callback(63 - Math.clz32(lsb));
    bitsHi = (bitsHi & (bitsHi - 1)) >>> 0;
  }
};

export default forEachBitGetSquare;
