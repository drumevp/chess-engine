import { ColorType } from "./color";

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

export type History = {
  move: number;
  undo: Undo;
};
