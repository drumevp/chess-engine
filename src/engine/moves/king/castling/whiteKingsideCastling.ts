import { squareBitboards } from "../../../lookupTables/importedPrecalculatedData";
import { encodeMove } from "../../../packedMove/main";
import { calculatePieceIndex, CASTLING_RIGHTS, KING_INDEX, ROOK_INDEX } from "../../../state/initialState";
import { COLOR, MOVE_FLAG } from "../../../types/main";
import type { AttackInfo } from "../../attackInfo/types";
import type { MoveGenerationContext } from "../../types";
import { WHITE_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE, WHITE_KING_ORIGIN_SQUARE, WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE, WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE } from "./generateCastlingMoves";

const whiteKingsideCastling = (ctx: MoveGenerationContext, attackInfo: AttackInfo): void => {
  const isWhiteKingsideCastlingAllowed = (ctx.castlingRights & CASTLING_RIGHTS.WHITE_KINGSIDE) !== 0;

  if (!isWhiteKingsideCastlingAllowed) {
    return;
  }

  const isKingOnOriginSquare = ctx.ownKingSquare === WHITE_KING_ORIGIN_SQUARE;

  if (!isKingOnOriginSquare) {
    return;
  }

  const h1Bitboard = squareBitboards[WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE];
  const rooksBitboard = ctx.state[(calculatePieceIndex(COLOR.WHITE, ROOK_INDEX))];
  const isRookOnH1 = (h1Bitboard & rooksBitboard) !== 0n;
  
  if (!isRookOnH1) {
    return;
  }

  const g1Bitboard = squareBitboards[WHITE_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE];
  const f1Bitboard = squareBitboards[WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE];

  // Between e1 and h1, the only squares are g1 and f1. So this mask handles both empty & safety
  const emptySafeMask = f1Bitboard | g1Bitboard;

  const isPathEmpty = (ctx.allOccupancy & emptySafeMask) === 0n;

  if (!isPathEmpty) {
    return;
  }

  const isPathSafe = (attackInfo.enemyAttackedSquares & emptySafeMask) === 0n;

  if (!isPathSafe) {
    return;
  }

  ctx.moves.push(encodeMove(ctx.ownKingSquare, WHITE_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE, ctx.color, KING_INDEX, MOVE_FLAG.KING_CASTLE));
}

export default whiteKingsideCastling;