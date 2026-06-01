import { N, NN, S, SS } from "../../helpers/movement";
import { COLOR, type ColorType } from "../../types/main";

type MovementFn = (bitboard: bigint) => bigint;

export type PawnConfigType = {
  moveForwardOneSquareFn: MovementFn;
  moveForwardTwoSquaresFn: MovementFn;
  promotionRank: number;
  originRank: number;
}

export const PAWN_CONFIG: Record<ColorType, PawnConfigType> = {
  [COLOR.WHITE]: {
    moveForwardOneSquareFn: N,
    moveForwardTwoSquaresFn: NN,
    promotionRank: 7,
    originRank: 1,
  },
  [COLOR.BLACK]: {
    moveForwardOneSquareFn: S,
    moveForwardTwoSquaresFn: SS,
    promotionRank: 0,
    originRank: 6,
  },
}