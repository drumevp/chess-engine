
import { getCurrentFile, getCurrentIndex, getCurrentRank } from "../../../helpers/main";
import { Bitboard } from "../../../types/bitboard";
import { bishopBlockerSubsets } from "./blockerSubsets";

export const bishopAttacks:  Bitboard[][] = [];

for(let i = 0; i < 64; i++) {
  bishopAttacks.push([]);
  const blockerSubsetsForBlockerMask = bishopBlockerSubsets[i];

  for(let j = 0; j < blockerSubsetsForBlockerMask.length; j++) {
    let bishopAttackMask:Bitboard = 0n;
    const blockerSubset = blockerSubsetsForBlockerMask[j];

    const currentFile = getCurrentFile(i);
    const currentRank = getCurrentRank(i);

    // Move north east
    for(let rank = currentRank + 1, file = currentFile + 1; rank <= 7 && file <= 7; rank++, file++) {
      const currentIndex = getCurrentIndex(rank, file);
      const currentIndexBitmap = 1n << BigInt(currentIndex);

      bishopAttackMask = bishopAttackMask | currentIndexBitmap;

      if ((blockerSubset & currentIndexBitmap) !== 0n) {
        break;
      }
    }

    // Move north west
    for(let rank = currentRank + 1, file = currentFile - 1; rank <= 7 && file >= 0; rank++, file--) {
      const currentIndex = getCurrentIndex(rank, file);
      const currentIndexBitmap = 1n << BigInt(currentIndex);

      bishopAttackMask = bishopAttackMask | currentIndexBitmap;

      if ((blockerSubset & currentIndexBitmap) !== 0n) {
        break;
      }
    }

    // Move south east
    for(let rank = currentRank - 1, file = currentFile + 1; rank >= 0 && file <= 7; rank--, file++) {
      const currentIndex = getCurrentIndex(rank, file);
      const currentIndexBitmap = 1n << BigInt(currentIndex);

      bishopAttackMask = bishopAttackMask | currentIndexBitmap;

      if ((blockerSubset & currentIndexBitmap) !== 0n) {
        break;
      }
    }

    // Move south west
    for(let rank = currentRank - 1, file = currentFile - 1; rank >= 0 && file >= 0; rank--, file--) {
      const currentIndex = getCurrentIndex(rank, file);
      const currentIndexBitmap = 1n << BigInt(currentIndex);

      bishopAttackMask = bishopAttackMask | currentIndexBitmap;

      if ((blockerSubset & currentIndexBitmap) !== 0n) {
        break;
      }
    }

    bishopAttacks[i][j] = bishopAttackMask;
  }
}