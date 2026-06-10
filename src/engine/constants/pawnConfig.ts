import { N, NN, S, SS } from "../helpers/movement";
import { ColorType } from "../types/color";
import { PawnConfigType } from "../types/pawnConfig";
import { COLOR } from "./color";

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