/**
 * King moves -> We take the castling rights and set the relevant bits to 0
 */
import { BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE, BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE, CASTLING_RIGHTS, WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE, WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE } from "../../../../constants/castling";
import { COLOR } from "../../../../constants/color";
import { MOVE_FLAG } from "../../../../constants/move";
import { KING_INDEX, ROOK_INDEX } from "../../../../constants/piece";
import { ColorType } from "../../../../types/color";
import { MoveFlagType } from "../../../../types/move";
import { Position } from "../../../../types/position";

const updateCastlingRights = (position: Position, moveFrom: number, moveTo: number, moveColor: ColorType, movePiece: number, moveFlag: MoveFlagType, moveCapturedPiece: number | null) => {
  // King moved
  if (movePiece === KING_INDEX) {
    if (moveColor === COLOR.WHITE) {
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
  if (movePiece === ROOK_INDEX) {
    switch (moveFrom) {
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
    moveCapturedPiece === ROOK_INDEX &&
    (moveFlag === MOVE_FLAG.CAPTURE ||
      moveFlag === MOVE_FLAG.PROMOTION_CAPTURE);

  if (!isRookCapture) {
    return;
  }

  switch (moveTo) {
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
