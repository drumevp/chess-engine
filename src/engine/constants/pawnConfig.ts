import { N32, NN32, S32, SS32 } from "../helpers/movement";
import { ColorType } from "../types/color";
import { PawnConfigType } from "../types/pawnConfig";
import { COLOR } from "./color";

export const PAWN_CONFIG: Record<ColorType, PawnConfigType> = {
  [COLOR.WHITE]: {
    moveForwardOneSquareFn: N32,
    moveForwardTwoSquaresFn: NN32,
    promotionRank: 7,
    originRank: 1,
  },
  [COLOR.BLACK]: {
    moveForwardOneSquareFn: S32,
    moveForwardTwoSquaresFn: SS32,
    promotionRank: 0,
    originRank: 6,
  },
};
