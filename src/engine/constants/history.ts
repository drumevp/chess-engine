import { Undo } from "../types/history";
import { COLOR } from "./color";

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
