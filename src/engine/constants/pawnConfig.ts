import { ColorType } from "../types/color";
import { PawnConfigType } from "../types/pawnConfig";
import { COLOR } from "./color";

export const PAWN_CONFIG: Record<ColorType, PawnConfigType> = {
  [COLOR.WHITE]: {
    promotionRank: 7,
    originRank: 1,
  },
  [COLOR.BLACK]: {
    promotionRank: 0,
    originRank: 6,
  },
};
