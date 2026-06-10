import { getCurrentFile, getCurrentIndex, getCurrentRank } from "../../../helpers/main";
import { Bitboard } from "../../../types/bitboard";



const calculateMaskForBishopPosition = (position: number): Bitboard => {
  const currentFile = getCurrentFile(position);
  const currentRank = getCurrentRank(position);

  let mask:Bitboard = 0x0000000000000000n;

  const addBitToMask = (rank: number, file: number) => {
    const index = getCurrentIndex(rank, file);

    mask = mask |  (1n << BigInt(index));
  }


  // Move north east
  for (let rank = currentRank + 1, file = currentFile + 1; rank <= 6 && file <= 6; rank++, file++) {
    addBitToMask(rank, file);
  }

  // Move north west
  for (let rank = currentRank + 1, file = currentFile -1; rank <= 6 && file >= 1; rank++, file--) {
    addBitToMask(rank, file);
  }

  // Move south east
  for (let file = currentFile + 1, rank = currentRank - 1; file <= 6 && rank >= 1; file++, rank--) {
    addBitToMask(rank, file);
  }

  // Move south west
  for (let file = currentFile - 1, rank = currentRank - 1; file >= 1 && rank >= 1; file--, rank--) {
    addBitToMask(rank, file);
  }

  return mask;
}

export const bishopRelevantBlockerMask: Bitboard[] = new Array(64);

for(let i = 0; i < 64; i++) {
  bishopRelevantBlockerMask[i] = calculateMaskForBishopPosition(i);
}
