import { squareBitboards } from "../../../lookupTables/importedPrecalculatedData";
import { encodeMove } from "../../../packedMove/main";
import { calculatePieceIndex, CASTLING_RIGHTS, KING_INDEX, ROOK_INDEX } from "../../../state/initialState";
import { COLOR, MOVE_FLAG } from "../../../types/main";
import type { AttackInfo } from "../../attackInfo/types";
import type { MoveGenerationContext } from "../../types";
import { BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE, BLACK_KING_ORIGIN_SQUARE, BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE, BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE } from "./generateCastlingMoves";

const blackKingsideCastling = (ctx: MoveGenerationContext, attackInfo: AttackInfo): void => {
  const isBlackKingsideCastlingAllowed = (ctx.castlingRights & CASTLING_RIGHTS.BLACK_KINGSIDE) !== 0;

  if (!isBlackKingsideCastlingAllowed) {
    return;
  }

  const isKingOnOriginSquare = ctx.ownKingSquare === BLACK_KING_ORIGIN_SQUARE;

  if (!isKingOnOriginSquare) {
    return;
  }

  const h8Bitboard = squareBitboards[BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE];
  const rooksBitboard = ctx.state[(calculatePieceIndex(COLOR.BLACK, ROOK_INDEX))];
  const isRookOnH8 = (h8Bitboard & rooksBitboard) !== 0n;
  
  if (!isRookOnH8) {
    return;
  }

  const g8Bitboard = squareBitboards[BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE];
  const f8Bitboard = squareBitboards[BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE];

  const emptySafeMask = f8Bitboard | g8Bitboard;

  const isPathEmpty = (ctx.allOccupancy & emptySafeMask) === 0n;

  if (!isPathEmpty) {
    return;
  }

  const isPathSafe = (attackInfo.enemyAttackedSquares & emptySafeMask) === 0n;

  if (!isPathSafe) {
    return;
  }

   ctx.moves.push(encodeMove(ctx.ownKingSquare, BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE, ctx.color, KING_INDEX, MOVE_FLAG.KING_CASTLE));
}

export default blackKingsideCastling;