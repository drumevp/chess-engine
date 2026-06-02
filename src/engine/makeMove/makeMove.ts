/**
 * makeMove updates the state of position for a specific legal move.
 * It needs to update
 * - state bitboards
 * - occupancy bitboards (all, white, black)
 * - color (side to move)
 * - en pessant square
 * - half move clock
 * - full move number
 * - pieceAt array
 * - kingSquares
 * - castling rights
 */

import { MOVE_FLAG, type Move, type Position } from "../types/main";
import quietMoveHandler from "./moveFlagHandlers/quietMoveHandler";
import getEnPassantSquare from "./helpers/getEnPassantSquare";
import captureMoveHandler from "./moveFlagHandlers/captureMoveHandler";
import enPassantMoveHandler from "./moveFlagHandlers/enPassantMoveHandler";
import promotionMoveHandler from "./moveFlagHandlers/promotionMoveHandler";
import promotionCaptureMoveHandler from "./moveFlagHandlers/promotionCaptureMoveHandler";
import kingsideCastleMoveHandler from "./moveFlagHandlers/kingsideCastleMoveHandler";
import queensideCastleMoveHandler from "./moveFlagHandlers/queensideCastleMoveHandler";
import updateSideToMove from "./positionUpdates/updateSideToMove";
import updateHalfMoveClock from "./positionUpdates/updateHalfMoveClock";
import updateFullMoveNumber from "./positionUpdates/updateFullMoveNumber";
import updateCastlingRights from "./positionUpdates/updateCastlingRights";

const makeMove = (position: Position, move: Move): void => {
  position.enPassantSquare = null;

  switch (move.flag) {
    case MOVE_FLAG.QUIET:
      quietMoveHandler(position, move);
      break;

    case MOVE_FLAG.DOUBLE_PAWN_PUSH:
      quietMoveHandler(position, move);
      position.enPassantSquare = getEnPassantSquare(move);
      break;

    case MOVE_FLAG.CAPTURE:
      captureMoveHandler(position, move);
      break;

    case MOVE_FLAG.PROMOTION:
      promotionMoveHandler(position, move);
      break;

    case MOVE_FLAG.PROMOTION_CAPTURE:
      promotionCaptureMoveHandler(position, move);
      break;

    case MOVE_FLAG.EN_PASSANT:
      enPassantMoveHandler(position, move);
      break;

    case MOVE_FLAG.KING_CASTLE:
      kingsideCastleMoveHandler(position, move);
      break;

    case MOVE_FLAG.QUEEN_CASTLE:
      queensideCastleMoveHandler(position, move);
      break;
  }

  updateCastlingRights(position, move);
  updateHalfMoveClock(position, move);
  updateFullMoveNumber(position);
  updateSideToMove(position);
};

export default makeMove;
