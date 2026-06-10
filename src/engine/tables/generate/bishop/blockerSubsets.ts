import { Bitboard } from "../../../types/bitboard";
import { bishopRelevantBlockerMask } from "./relevantBlockerMask";

export const bishopBlockerSubsets: Bitboard[][] = [];

bishopRelevantBlockerMask.forEach((mask, i) => {
  bishopBlockerSubsets.push([]);
  let subset = mask;

  while(true) {
    bishopBlockerSubsets[i].push(subset);

    if (subset === 0n) {
      break;
    }

    subset = (subset - 1n) & mask;
  }
})
