/**
 * Loops through each set bit in a bitboard, lowest square first.
 * Calls callback with square index 0-63.
 */

import { LOWER_32_BITS_MASK } from "../constants/mask";
import { Bitboard } from "../types/bitboard";

const forEachBitGetSquare = (
  bitboard: Bitboard,
  callback: (square: number) => void,
) => {
  let bits = Number(bitboard & LOWER_32_BITS_MASK);

  while (bits !== 0) {
    const lsb = bits & -bits;
    callback(31 - Math.clz32(lsb));
    bits = (bits & (bits - 1)) >>> 0;
  }

  bits = Number(bitboard >> 32n);

  while (bits !== 0) {
    const lsb = bits & -bits;
    callback(63 - Math.clz32(lsb));
    bits = (bits & (bits - 1)) >>> 0;
  }
};

export default forEachBitGetSquare;
