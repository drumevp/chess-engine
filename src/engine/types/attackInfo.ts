export type AttackInfo = {
  // Enemy pieces checking the king
  checkersLo: number;
  checkersHi: number;
  checkCount: number;

  pinnedPiecesLo: number;
  pinnedPiecesHi: number;

  // For each square, get the ray that the pinned piece is allowed to move in
  // If the square is not pinned, we set it to 0n
  pinRaysBySquareLo: Uint32Array;
  pinRaysBySquareHi: Uint32Array;

  // If the king is in check, what squares can pieces go to to stop the check
  // In the case the king isn't in check, the mask is the FULL_BOARD (all 1s)
  checkMaskLo: number;
  checkMaskHi: number;
};
