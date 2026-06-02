import type { ColorType, Move } from "./main"

export type Undo = {
  previousColor: ColorType;
  previousCastlingRights: number;
  previousEnPassantSquare: number | null;
  previousHalfMoveClock: number;
  previousFullMoveNumber: number;
  previousKingSquares: Int8Array;

  capturedPieceStateIndex: number | null;
  capturedSquare: number | null;
}

export type History = {
  move: Move;
  undo: Undo;
}