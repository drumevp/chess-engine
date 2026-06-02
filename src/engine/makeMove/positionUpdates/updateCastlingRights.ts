/**
 * King moves -> We take the castling rights and set the relevant bits to 0
 */

import {
  BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE,
  BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE,
  WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE,
  WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE,
} from "../../moves/king/castling/generateCastlingMoves";
import {
  CASTLING_RIGHTS,
  KING_INDEX,
  ROOK_INDEX,
} from "../../state/initialState";
import { COLOR, MOVE_FLAG, type Move, type Position } from "../../types/main";

const updateCastlingRights = (position: Position, move: Move) => {
  // King moved
  if (move.piece === KING_INDEX) {
    if (move.color === COLOR.WHITE) {
      position.castlingRights =
        position.castlingRights &
        ~(CASTLING_RIGHTS.WHITE_KINGSIDE | CASTLING_RIGHTS.WHITE_QUEENSIDE);
    } else {
      position.castlingRights =
        position.castlingRights &
        ~(CASTLING_RIGHTS.BLACK_KINGSIDE | CASTLING_RIGHTS.BLACK_QUEENSIDE);
    }
  }

  // Rook moved
  if (move.piece === ROOK_INDEX) {
    switch (move.from) {
      case WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE:
        position.castlingRights &= ~CASTLING_RIGHTS.WHITE_KINGSIDE;
        break;
      case WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE:
        position.castlingRights &= ~CASTLING_RIGHTS.WHITE_QUEENSIDE;
        break;
      case BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE:
        position.castlingRights &= ~CASTLING_RIGHTS.BLACK_KINGSIDE;
        break;
      case BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE:
        position.castlingRights &= ~CASTLING_RIGHTS.BLACK_QUEENSIDE;
        break;
    }
  }

  // Rook captured on origin square
  const isRookCapture =
    move.capturedPiece === ROOK_INDEX &&
    (move.flag === MOVE_FLAG.CAPTURE ||
      move.flag === MOVE_FLAG.PROMOTION_CAPTURE);

  if (!isRookCapture) {
    return;
  }

  switch (move.to) {
    case WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE:
      position.castlingRights &= ~CASTLING_RIGHTS.WHITE_KINGSIDE;
      break;
    case WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE:
      position.castlingRights &= ~CASTLING_RIGHTS.WHITE_QUEENSIDE;
      break;
    case BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE:
      position.castlingRights &= ~CASTLING_RIGHTS.BLACK_KINGSIDE;
      break;
    case BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE:
      position.castlingRights &= ~CASTLING_RIGHTS.BLACK_QUEENSIDE;
      break;
  }
};

export default updateCastlingRights;
