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
import type { Undo } from "../../../types/history";
import getOppositeColor from "../../../helpers/getOppositeColor";
import { moveDecodeCapturedPiece, moveDecodeColor, moveDecodeFlag, moveDecodeFrom, moveDecodePiece, moveDecodePromotionPiece, moveDecodeTo } from "../packedMove";
import { Position } from "../../../types/position";
import calculatePieceIndex from "../../../helpers/calculatePieceIndex";
import { MOVE_FLAG } from "../../../constants/move";
import { COLOR } from "../../../constants/color";

const makeMove = (position: Position, move: number): Undo => {
  const undo: Undo = {
    previousColor: position.color,
    previousCastlingRights: position.castlingRights,
    previousEnPassantSquare: position.enPassantSquare,
    previousFullMoveNumber: position.fullMoveNumber,
    previousHalfMoveClock: position.halfMoveClock,
    previousKingSquares: new Int8Array(position.kingSquares),

    capturedPieceStateIndex: null,
    capturedSquare: null,
  }

  position.enPassantSquare = null;

  const moveFrom = moveDecodeFrom(move);
  const moveTo = moveDecodeTo(move);
  const moveColor = moveDecodeColor(move);
  const movePiece = moveDecodePiece(move);
  const moveFlag = moveDecodeFlag(move);
  const moveCapturedPiece = moveDecodeCapturedPiece(move);
  const movePromotionPiece = moveDecodePromotionPiece(move); 

  switch (moveFlag) {
    case MOVE_FLAG.QUIET:
      quietMoveHandler(position, moveFrom, moveTo, moveColor, movePiece);
      break;

    case MOVE_FLAG.DOUBLE_PAWN_PUSH:
      quietMoveHandler(position, moveFrom, moveTo, moveColor, movePiece);
      position.enPassantSquare = getEnPassantSquare(moveFrom, moveTo);
      break;

    case MOVE_FLAG.CAPTURE:
      captureMoveHandler(position, moveFrom, moveTo, moveColor, movePiece);
      break;

    case MOVE_FLAG.PROMOTION:
      promotionMoveHandler(position, moveFrom, moveTo, moveColor, movePromotionPiece);
      break;

    case MOVE_FLAG.PROMOTION_CAPTURE:
      promotionCaptureMoveHandler(position, moveFrom, moveTo, moveColor, movePromotionPiece);
      break;

    case MOVE_FLAG.EN_PASSANT:
      enPassantMoveHandler(position, moveFrom, moveTo, moveColor, movePiece);
      break;

    case MOVE_FLAG.KING_CASTLE:
      kingsideCastleMoveHandler(position, moveFrom, moveTo, moveColor);
      break;

    case MOVE_FLAG.QUEEN_CASTLE:
      queensideCastleMoveHandler(position, moveFrom, moveTo, moveColor);
      break;
  }

  updateCastlingRights(position, moveFrom, moveTo, moveColor, movePiece, moveFlag, moveCapturedPiece);
  updateHalfMoveClock(position, moveFlag, movePiece);
  updateFullMoveNumber(position);
  updateSideToMove(position);

  if (moveCapturedPiece !== null) {
    undo.capturedPieceStateIndex = calculatePieceIndex(getOppositeColor(moveColor), moveCapturedPiece);
    
    if (moveFlag === MOVE_FLAG.EN_PASSANT) {
      undo.capturedSquare = moveColor === COLOR.WHITE ? moveTo - 8 : moveTo + 8;
    } else {
      undo.capturedSquare = moveTo;
    }
  }
  

  return undo;
};

export default makeMove;
