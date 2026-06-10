/**
 * Evaluate all attack variations for each blocker subset enumeration.
 * 
 * ARRAY[relevant blocker mask][blocker subset] = attack
 * 
 * For the rook, we slide in each direction until we reach a blocker or an edge. Both are included.
 */

import { getCurrentFile, getCurrentIndex, getCurrentRank } from "../../../helpers/main";
import { Bitboard } from "../../../types/bitboard";
import { rookBlockerSubsets } from "./blockerSubsets";

export const rookAttacks: Bitboard[][] = [];

for(let i = 0; i < 64; i++) {
  rookAttacks.push([]);
  const blockerSubsetsForBlockerMask = rookBlockerSubsets[i];

  for(let j = 0; j < blockerSubsetsForBlockerMask.length; j++) {
    let rookAttackMask:Bitboard = 0n;
    const blockerSubset = blockerSubsetsForBlockerMask[j];

    const currentFile = getCurrentFile(i);
    const currentRank = getCurrentRank(i);

    // Move north
    for(let rank = currentRank + 1; rank <= 7; rank++) {
      // Create a number with a bit value of 1 at the current position for comparison with the blocker subset
      const currentIndex = getCurrentIndex(rank, currentFile);
      const currentIndexBitmap = 1n << BigInt(currentIndex);

      // Add bit to attacks
      rookAttackMask = rookAttackMask | currentIndexBitmap;

      if ((blockerSubset & currentIndexBitmap) !== 0n) {
        break;
      }
    }

    // Move south
    for(let rank = currentRank - 1; rank >= 0; rank--) {
      const currentIndex = getCurrentIndex(rank, currentFile);
      const currentIndexBitmap = 1n << BigInt(currentIndex);

      rookAttackMask = rookAttackMask | currentIndexBitmap;

      if ((blockerSubset & currentIndexBitmap) !== 0n) {
        break;
      }
    }

    // Move east
    for(let file = currentFile + 1; file <= 7; file++) {
      const currentIndex = getCurrentIndex(currentRank, file);
      const currentIndexBitmap = 1n << BigInt(currentIndex);

      rookAttackMask = rookAttackMask | currentIndexBitmap;

      if ((blockerSubset & currentIndexBitmap) !== 0n) {
        break;
      }
    }

    // Move west
    for(let file = currentFile - 1; file >= 0; file--) {
      const currentIndex = getCurrentIndex(currentRank, file);
      const currentIndexBitmap = 1n << BigInt(currentIndex);

      rookAttackMask = rookAttackMask | currentIndexBitmap;

      if ((blockerSubset & currentIndexBitmap) !== 0n) {
        break;
      }
    }

    rookAttacks[i][j] = rookAttackMask;
  }
}