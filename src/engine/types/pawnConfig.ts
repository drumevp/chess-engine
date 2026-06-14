import { Bitboard32 } from "./bitboard";

type MovementFn = (
  bitboardLo: number,
  bitboardHi: number,
  out: Bitboard32,
) => void;

export type PawnConfigType = {
  moveForwardOneSquareFn: MovementFn;
  moveForwardTwoSquaresFn: MovementFn;
  promotionRank: number;
  originRank: number;
};
