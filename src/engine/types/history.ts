import type { ColorType } from "./main";

export type Undo = {
  previousColor: ColorType;
  previousCastlingRights: number;
  previousEnPassantSquare: number | null;
  previousHalfMoveClock: number;
  previousFullMoveNumber: number;
  previousKingSquares: Int8Array;

  capturedPieceStateIndex: number | null;
  capturedSquare: number | null;
};

export type History = {
  move: number;
  undo: Undo;
};
