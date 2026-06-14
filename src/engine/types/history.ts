import { ColorType } from "./color";
import { COLOR } from "../constants/color";

export type Undo = {
  previousColor: ColorType;
  previousCastlingRights: number;
  previousEnPassantSquare: number | null;
  previousHalfMoveClock: number;
  previousFullMoveNumber: number;
  previousWhiteKingSquare: number;
  previousBlackKingSquare: number;
  previousZobristHash: bigint;

  capturedPieceStateIndex: number | null;
  capturedSquare: number | null;
};

export const createUndo = (): Undo => ({
  previousColor: COLOR.WHITE,
  previousCastlingRights: 0,
  previousEnPassantSquare: null,
  previousHalfMoveClock: 0,
  previousFullMoveNumber: 0,
  previousWhiteKingSquare: -1,
  previousBlackKingSquare: -1,
  previousZobristHash: 0n,
  capturedPieceStateIndex: null,
  capturedSquare: null,
});

export type History = {
  move: number;
  undo: Undo;
};
