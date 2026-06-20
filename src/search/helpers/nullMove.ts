import hashPosition from "../../engine/hash/zobrist";
import getOppositeColor from "../../engine/helpers/getOppositeColor";
import type { Position } from "../../engine/types/position";
import type { NullMoveUndo } from "../types/nullMove";

export const makeNullMove = (
  position: Position,
  undo: NullMoveUndo,
): void => {
  undo.previousColor = position.color;
  undo.previousEnPassantSquare = position.enPassantSquare;
  undo.previousFullMoveNumber = position.fullMoveNumber;
  undo.previousHalfMoveClock = position.halfMoveClock;
  undo.previousZobristHash = position.zobristHash;

  position.color = getOppositeColor(position.color);
  position.enPassantSquare = null;
  position.zobristHash = hashPosition(position);
};

export const undoNullMove = (
  position: Position,
  undo: NullMoveUndo,
): void => {
  position.color = undo.previousColor;
  position.enPassantSquare = undo.previousEnPassantSquare;
  position.fullMoveNumber = undo.previousFullMoveNumber;
  position.halfMoveClock = undo.previousHalfMoveClock;
  position.zobristHash = undo.previousZobristHash;
};
