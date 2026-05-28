/**
 * Generate a mask with all legal moves for each square (i). From the starting square (i) (excluding the starting square)
 * mark each square that the piece can move to, excluding edges (rank 1, 8 & file A, H)
 */

import { getCurrentFile, getCurrentIndex, getCurrentRank } from "../../helpers/main";


const calculateMaskForRookPosition = (position: number): bigint => {
  const currentFile = getCurrentFile(position);
  const currentRank = getCurrentRank(position);

  let mask:bigint = 0x0000000000000000n;

  const addBitToMask = (rank: number, file: number) => {
    const index = getCurrentIndex(rank, file);

    mask = mask |  (1n << BigInt(index));
  }


  // Move north
  for (let rank = currentRank + 1; rank <= 6; rank++) {
    addBitToMask(rank, currentFile);
  }

  // Move south
  for (let rank = currentRank - 1; rank >= 1; rank--) {
    addBitToMask(rank, currentFile);
  }

  // Move west
  for (let file = currentFile - 1; file >= 1; file--) {
    addBitToMask(currentRank, file);
  }

  // Move east
  for (let file = currentFile + 1; file <= 6; file++) {
    addBitToMask(currentRank, file);
  }

  return mask;
}

export const rookRelevantBlockerMask: bigint[] = new Array(64);

for(let i = 0; i < 64; i++) {
  rookRelevantBlockerMask[i] = calculateMaskForRookPosition(i);
}
