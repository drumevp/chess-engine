import type { ColorType } from "../../engine/types/color";
import { COLOR } from "../../engine/constants/color";

export type NullMoveUndo = {
  previousColor: ColorType;
  previousEnPassantSquare: number | null;
  previousFullMoveNumber: number;
  previousHalfMoveClock: number;
  previousZobristHash: bigint;
};

export const createNullMoveUndo = (): NullMoveUndo => ({
  previousColor: COLOR.WHITE,
  previousEnPassantSquare: null,
  previousFullMoveNumber: 0,
  previousHalfMoveClock: 0,
  previousZobristHash: 0n,
});
