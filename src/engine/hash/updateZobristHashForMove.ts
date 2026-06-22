import {
  BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE,
  BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE,
  BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE,
  BLACK_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
  WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE,
  WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE,
  WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE,
  WHITE_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
} from "../constants/castling";
import { COLOR } from "../constants/color";
import { MOVE_FLAG } from "../constants/move";
import { ROOK_INDEX } from "../constants/piece";
import calculatePieceIndex from "../helpers/calculatePieceIndex";
import getOppositeColor from "../helpers/getOppositeColor";
import { zobristBlackToMoveKey } from "../tables/generated/zobristBlackToMoveKey";
import { zobristCastlingMaskKeys } from "../tables/generated/zobristCastlingMaskKeys";
import { zobristEnPassantFileKeys } from "../tables/generated/zobristEnPassantFileKeys";
import { zobristPieceSquareKeys } from "../tables/generated/zobristPieceSquareKeys";
import type { ColorType } from "../types/color";
import type { MoveFlagType } from "../types/move";
import type { Position } from "../types/position";
import getHashableEnPassantFile from "./helpers/getHashableEnPassantFile";

const xorPieceSquare = (
  hash: bigint,
  color: ColorType,
  piece: number,
  square: number,
): bigint =>
  hash ^ zobristPieceSquareKeys[calculatePieceIndex(color, piece)][square];

const requirePiece = (piece: number | null, moveType: string): number => {
  if (piece === null) {
    throw new Error(`No ${moveType} piece in encoded move`);
  }

  return piece;
};

const updateZobristHashForMove = (
  position: Position,
  moveFrom: number,
  moveTo: number,
  moveColor: ColorType,
  movePiece: number,
  moveCapturedPiece: number | null,
  movePromotionPiece: number | null,
  moveFlag: MoveFlagType,
  previousCastlingRights: number,
  previousHashableEnPassantFile: number | null,
): bigint => {
  let hash = position.zobristHash ^ zobristBlackToMoveKey;

  if (previousCastlingRights !== position.castlingRights) {
    hash ^= zobristCastlingMaskKeys[previousCastlingRights];
    hash ^= zobristCastlingMaskKeys[position.castlingRights];
  }

  if (previousHashableEnPassantFile !== null) {
    hash ^= zobristEnPassantFileKeys[previousHashableEnPassantFile];
  }

  const hashableEnPassantFile = getHashableEnPassantFile(position);

  if (hashableEnPassantFile !== null) {
    hash ^= zobristEnPassantFileKeys[hashableEnPassantFile];
  }

  hash = xorPieceSquare(hash, moveColor, movePiece, moveFrom);

  switch (moveFlag) {
    case MOVE_FLAG.QUIET:
    case MOVE_FLAG.DOUBLE_PAWN_PUSH:
      return xorPieceSquare(hash, moveColor, movePiece, moveTo);

    case MOVE_FLAG.CAPTURE: {
      const capturedPiece = requirePiece(moveCapturedPiece, "captured");
      hash = xorPieceSquare(
        hash,
        getOppositeColor(moveColor),
        capturedPiece,
        moveTo,
      );

      return xorPieceSquare(hash, moveColor, movePiece, moveTo);
    }

    case MOVE_FLAG.PROMOTION: {
      const promotionPiece = requirePiece(movePromotionPiece, "promotion");

      return xorPieceSquare(hash, moveColor, promotionPiece, moveTo);
    }

    case MOVE_FLAG.PROMOTION_CAPTURE: {
      const capturedPiece = requirePiece(moveCapturedPiece, "captured");
      const promotionPiece = requirePiece(movePromotionPiece, "promotion");
      hash = xorPieceSquare(
        hash,
        getOppositeColor(moveColor),
        capturedPiece,
        moveTo,
      );

      return xorPieceSquare(hash, moveColor, promotionPiece, moveTo);
    }

    case MOVE_FLAG.EN_PASSANT: {
      const capturedPiece = requirePiece(moveCapturedPiece, "captured");
      const capturedSquare =
        moveColor === COLOR.WHITE ? moveTo - 8 : moveTo + 8;
      hash = xorPieceSquare(
        hash,
        getOppositeColor(moveColor),
        capturedPiece,
        capturedSquare,
      );

      return xorPieceSquare(hash, moveColor, movePiece, moveTo);
    }

    case MOVE_FLAG.KING_CASTLE: {
      const rookFrom =
        moveColor === COLOR.WHITE
          ? WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE
          : BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE;
      const rookTo =
        moveColor === COLOR.WHITE
          ? WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE
          : BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE;
      hash = xorPieceSquare(hash, moveColor, movePiece, moveTo);
      hash = xorPieceSquare(hash, moveColor, ROOK_INDEX, rookFrom);

      return xorPieceSquare(hash, moveColor, ROOK_INDEX, rookTo);
    }

    case MOVE_FLAG.QUEEN_CASTLE: {
      const rookFrom =
        moveColor === COLOR.WHITE
          ? WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE
          : BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE;
      const rookTo =
        moveColor === COLOR.WHITE
          ? WHITE_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE
          : BLACK_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE;
      hash = xorPieceSquare(hash, moveColor, movePiece, moveTo);
      hash = xorPieceSquare(hash, moveColor, ROOK_INDEX, rookFrom);

      return xorPieceSquare(hash, moveColor, ROOK_INDEX, rookTo);
    }
  }
};

export default updateZobristHashForMove;
