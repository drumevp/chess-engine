export type AttackInfo = {
  // All squares attacked by enemy pieces
  // Restricting king movement
  enemyAttackedSquares: bigint;

  // Enemy pieces checking the king
  checkers: bigint;
  checkCount: number;

  pinnedPieces: bigint;

  // For each square, get the ray that the pinned piece is allowed to move in
  // If the square is not pinned, we set it to 0n
  pinRaysBySquare: bigint[];

  // If the king is in check, what squares can pieces go to to stop the check
  // In the case the king isn't in check, the mask is the FULL_BOARD (all 1s)
  checkMask: bigint;
}