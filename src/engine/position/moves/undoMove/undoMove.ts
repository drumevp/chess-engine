/**
 * We revert the previous move by updating all the states in Position
 * - set and clear square update: pieceAt, allOccupancy, whiteOccupancy, blackOccupancy, state bitboards
 * - from the Undo type, we update, color, castling rights, en passant square, half move clock, full move number, king squares
 * - for captures, the Undo types has the captured piece state index & the piece square so we can place it back
 */
import { BLACK_KING_ORIGIN_SQUARE, BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE, BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE, BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE, BLACK_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE, WHITE_KING_ORIGIN_SQUARE, WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE, WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE, WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE, WHITE_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE } from "../../../constants/castling";
import { COLOR } from "../../../constants/color";
import { MOVE_FLAG } from "../../../constants/move";
import { KING_INDEX, ROOK_INDEX } from "../../../constants/piece";
import calculatePieceIndex from "../../../helpers/calculatePieceIndex";
import { Undo } from "../../../types/history";
import { Position } from "../../../types/position";
import clearSquare from "../occupancyHelpers/clearSquare";
import setSquare from "../occupancyHelpers/setSquare";
import { moveDecodeColor, moveDecodeFlag, moveDecodeFrom, moveDecodePiece, moveDecodeTo } from "../packedMove";

const undoMove = (position: Position, move: number, undo: Undo): void => {
  const moveColor = moveDecodeColor(move);
  const movePiece = moveDecodePiece(move);
  const moveFlag = moveDecodeFlag(move);
  const moveFrom = moveDecodeFrom(move);
  const moveTo = moveDecodeTo(move);

  const movingPieceStateIndex = calculatePieceIndex(moveColor, movePiece);

  switch (moveFlag) {
    case MOVE_FLAG.QUIET:
    case MOVE_FLAG.DOUBLE_PAWN_PUSH:
      clearSquare(position, moveTo);
      setSquare(position, moveFrom, movingPieceStateIndex);
      break;

    case MOVE_FLAG.CAPTURE:
    case MOVE_FLAG.PROMOTION_CAPTURE:
    case MOVE_FLAG.EN_PASSANT:
      clearSquare(position, moveTo);
      setSquare(position, moveFrom, movingPieceStateIndex);

      if (undo.capturedSquare === null || undo.capturedPieceStateIndex === null) {
        throw new Error('No valid captured piece to undo');
      }

      setSquare(position, undo.capturedSquare, undo.capturedPieceStateIndex);
      break;

    case MOVE_FLAG.PROMOTION:
      clearSquare(position, moveTo);
      setSquare(position, moveFrom, movingPieceStateIndex);
      break;

    case MOVE_FLAG.KING_CASTLE:
      // WHITE
      if (moveColor === COLOR.WHITE) {
        // reset white king
        clearSquare(position, moveTo);
        setSquare(position, WHITE_KING_ORIGIN_SQUARE, calculatePieceIndex(COLOR.WHITE, KING_INDEX));

        // reset white rook
        clearSquare(position, WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE);
        setSquare(position, WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE, calculatePieceIndex(COLOR.WHITE, ROOK_INDEX));
      } else {
        // reset black king
        clearSquare(position, moveTo);
        setSquare(position, BLACK_KING_ORIGIN_SQUARE, calculatePieceIndex(COLOR.BLACK, KING_INDEX));

        // reset black rook
        clearSquare(position, BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE);
        setSquare(position, BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE, calculatePieceIndex(COLOR.BLACK, ROOK_INDEX));
      }
      break;

    case MOVE_FLAG.QUEEN_CASTLE:
      // WHITE
      if (moveColor === COLOR.WHITE) {
        // reset white king
        clearSquare(position, moveTo);
        setSquare(position, WHITE_KING_ORIGIN_SQUARE, calculatePieceIndex(COLOR.WHITE, KING_INDEX));

        // reset white rook
        clearSquare(position, WHITE_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE);
        setSquare(position, WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE, calculatePieceIndex(COLOR.WHITE, ROOK_INDEX));
      } else {
        // reset black king
        clearSquare(position, moveTo);
        setSquare(position, BLACK_KING_ORIGIN_SQUARE, calculatePieceIndex(COLOR.BLACK, KING_INDEX));

        // reset black rook
        clearSquare(position, BLACK_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE);
        setSquare(position, BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE, calculatePieceIndex(COLOR.BLACK, ROOK_INDEX));
      }
      break;
  }

  position.color = undo.previousColor;
  position.enPassantSquare = undo.previousEnPassantSquare;
  position.fullMoveNumber = undo.previousFullMoveNumber;
  position.halfMoveClock = undo.previousHalfMoveClock;
  position.kingSquares[COLOR.WHITE] = undo.previousKingSquares[COLOR.WHITE];
  position.kingSquares[COLOR.BLACK] = undo.previousKingSquares[COLOR.BLACK];
  position.castlingRights = undo.previousCastlingRights;
}


export default undoMove;