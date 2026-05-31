/**
 * Loop through each bit on a bitboard, extracting the lowest bit first
 * The callback function returns the index 0-63 for that bit
 */

import { squareIndexByBitboard } from "../lookupTables/importedPrecalculatedData";

const forEachBitGetSquare = (bitboard: bigint, callback: (square: number) => void) => {
  let bb = bitboard;

  while(bb !== 0n) {
    const leastSignificantBit = bb & -bb;
    const square = squareIndexByBitboard.get(leastSignificantBit);

    if (square === undefined) {
      throw new Error('Invalid bitboard state');
    }

    callback(square);

    bb = bb & (bb - 1n);
  }
}

export default forEachBitGetSquare;