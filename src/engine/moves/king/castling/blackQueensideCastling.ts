import { squareBitboards } from "../../../lookupTables/importedPrecalculatedData";
import { calculatePieceIndex, CASTLING_RIGHTS, KING_INDEX, ROOK_INDEX } from "../../../state/initialState";
import { COLOR, MOVE_FLAG, type Move } from "../../../types/main";
import type { AttackInfo } from "../../attackInfo/types";
import type { MoveGenerationContext } from "../../types";
import { BLACK_KING_ORIGIN_SQUARE, BLACK_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE, BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE, BLACK_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE } from "./generateCastlingMoves";

const blackQueenCastling = (ctx: MoveGenerationContext, attackInfo: AttackInfo): Move | null => {
  const isBlackQueensideCastlingAllowed = (ctx.castlingRights & CASTLING_RIGHTS.BLACK_QUEENSIDE) !== 0;

  if (!isBlackQueensideCastlingAllowed) {
    return null;
  }

  const isKingOnOriginSquare = ctx.ownKingSquare === BLACK_KING_ORIGIN_SQUARE;

  if (!isKingOnOriginSquare) {
    return null;
  }

  const a8Bitboard = squareBitboards[BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE];
  const rooksBitboard = ctx.state[(calculatePieceIndex(COLOR.BLACK, ROOK_INDEX))];
  const isRookOnA8 = (a8Bitboard & rooksBitboard) !== 0n;
  
  if (!isRookOnA8) {
    return null;
  }

  const c8Bitboard = squareBitboards[BLACK_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE];
  const d8Bitboard = squareBitboards[BLACK_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE];

  const safeMask = c8Bitboard | d8Bitboard;
  const emptyMask = squareBitboards[57] | c8Bitboard | d8Bitboard; 

  const isPathEmpty = (ctx.allOccupancy & emptyMask) === 0n;

  if (!isPathEmpty) {
    return null;
  }

  const isPathSafe = (attackInfo.enemyAttackedSquares & safeMask) === 0n;

  if (!isPathSafe) {
    return null;
  }

  return {
    color: ctx.color,
    flag: MOVE_FLAG.QUEEN_CASTLE,
    from: ctx.ownKingSquare,
    to: BLACK_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE,
    piece: KING_INDEX,
  }
}

export default blackQueenCastling;