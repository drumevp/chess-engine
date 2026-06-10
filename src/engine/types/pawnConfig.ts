type MovementFn = (bitboard: bigint) => bigint;

export type PawnConfigType = {
  moveForwardOneSquareFn: MovementFn;
  moveForwardTwoSquaresFn: MovementFn;
  promotionRank: number;
  originRank: number;
}
