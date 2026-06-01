import { squareBitboards } from "../../../lookupTables/importedPrecalculatedData";
import { calculatePieceIndex, CASTLING_RIGHTS, KING_INDEX, ROOK_INDEX } from "../../../state/initialState";
import { COLOR, MOVE_FLAG, type Move } from "../../../types/main";
import type { AttackInfo } from "../../attackInfo/types";
import type { MoveGenerationContext } from "../../types";
import { BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE, BLACK_KING_ORIGIN_SQUARE, BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE, BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE } from "./generateCastlingMoves";

const blackKingsideCastling = (ctx: MoveGenerationContext, attackInfo: AttackInfo): Move | null => {
  const isBlackKingsideCastlingAllowed = (ctx.castlingRights & CASTLING_RIGHTS.BLACK_KINGSIDE) !== 0;

  if (!isBlackKingsideCastlingAllowed) {
    return null;
  }

  const isKingOnOriginSquare = ctx.ownKingSquare === BLACK_KING_ORIGIN_SQUARE;

  if (!isKingOnOriginSquare) {
    return null;
  }

  const h8Bitboard = squareBitboards[BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE];
  const rooksBitboard = ctx.state[(calculatePieceIndex(COLOR.BLACK, ROOK_INDEX))];
  const isRookOnH8 = (h8Bitboard & rooksBitboard) !== 0n;
  
  if (!isRookOnH8) {
    return null;
  }

  const g8Bitboard = squareBitboards[BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE];
  const f8Bitboard = squareBitboards[BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE];

  const emptySafeMask = f8Bitboard | g8Bitboard;

  const isPathEmpty = (ctx.allOccupancy & emptySafeMask) === 0n;

  if (!isPathEmpty) {
    return null;
  }

  const isPathSafe = (attackInfo.enemyAttackedSquares & emptySafeMask) === 0n;

  if (!isPathSafe) {
    return null;
  }

  return {
    color: ctx.color,
    flag: MOVE_FLAG.KING_CASTLE,
    from: ctx.ownKingSquare,
    to: BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE,
    piece: KING_INDEX,
  }
}

export default blackKingsideCastling;