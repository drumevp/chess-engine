/**
 * Create a table that is accessed by square indexes.
 * table[0][2] will return the bits between a1 and c1
 */

import { getCurrentFile, getCurrentRank } from "../../helpers/main";
import { Bitboard } from "../../types/bitboard";

const generateBetweenSquaresTable = (): Bitboard[][] => {
  const table: Bitboard[][] = Array.from({length: 64}, () => Array<Bitboard>(64).fill(0n));

  for(let from = 0; from < 64; from++) {
    const fromFile = getCurrentFile(from);
    const fromRank = getCurrentRank(from);

    for(let to = 0; to < 64; to++) {
      const toFile = getCurrentFile(to);
      const toRank = getCurrentRank(to);
      
      const fileDiff = toFile - fromFile;
      const rankDiff = toRank - fromRank;

      const sameFile = fileDiff === 0;
      const sameRank = rankDiff === 0;
      const sameDiagonal = Math.abs(fileDiff) === Math.abs(rankDiff);

      if (!sameFile && !sameRank && !sameDiagonal) {
        table[from][to] = 0n;
        continue;
      }

      const fileStep = Math.sign(fileDiff);
      const rankStep = Math.sign(rankDiff);

      const squareStep = rankStep * 8 + fileStep;

      let current = from + squareStep;
      let mask = 0n;

      while (current !== to) {
        mask |= 1n << BigInt(current);
        current += squareStep;
      }

      table[from][to] = mask;

    }
  }

  return table;
}

export default generateBetweenSquaresTable;