/**
 * Rook blocker subset enumeration
 * 
 * For each relevant blocker mask, generate a subset of blockers
 * For example, for a1, we have 2 * (8 - 2) = 12 masked values
 * This means we need to generate a table with 2^12=4096 values
 * This is because we need every possible variation. For example a blocker
 * on a3 and a5 and so on all the way up to all possible blockers
 * 
 * The most efficient algorithm for this is
 * subset = (subset - 1) & mask
 * 
 * This will generate every possible subset of the mask
 * 
 * For example, if we have a bitboard with xyz values, it will generate
 * xyz
 * xy
 * xz
 * x
 * yz
 * y
 * z
 * empty
 */

import { Bitboard } from "../../../types/bitboard";
import { rookRelevantBlockerMask } from "./relevantBlockerMask";

export const rookBlockerSubsets: Bitboard[][] = [];

rookRelevantBlockerMask.forEach((mask, i) => {
  rookBlockerSubsets.push([]);
  let subset = mask;

  while(true) {
    rookBlockerSubsets[i].push(subset);

    if (subset === 0n) {
      break;
    }

    subset = (subset - 1n) & mask;
  }
})
