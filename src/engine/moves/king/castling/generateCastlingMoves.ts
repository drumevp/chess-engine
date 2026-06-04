/**
 * CASTLING RULES:
 * 1) The castling bits from ctx.castlingRights must be set. For white king, 0011 for black king 1100.
 *    Where 0001 is castling kingside and 0010 is castling queenside
 * 2) The king and rook must be on their original squares. Even though castling righs bits should be unset if either
 *    of these pieces moves, we still check valid positioning
 * 3) The squares between the king and the rook are empty
 * 4) The king is not currently in check
 * 5) The king does not pass through an attacked square (The rook may pass through an attacked square)
 * 6) The king does not land on an attacked square
 */

import { COLOR } from "../../../types/main";
import type { AttackInfo } from "../../attackInfo/types";
import type { MoveGenerationContext } from "../../types";
import blackKingsideCastling from "./blackKingsideCastling";
import blackQueenCastling from "./blackQueensideCastling";
import whiteKingsideCastling from "./whiteKingsideCastling";
import whiteQueenCastling from "./whiteQueensideCastling";

// King origin squares
export const WHITE_KING_ORIGIN_SQUARE = 4; // e1
export const BLACK_KING_ORIGIN_SQUARE = 60; // e8

// Rook origin squares
export const WHITE_KINGSIDE_ROOK_ORIGIN_SQUARE = 7; // h1
export const WHITE_QUEENSIDE_ROOK_ORIGIN_SQUARE = 0; // a1
export const BLACK_KINGSIDE_ROOK_ORIGIN_SQUARE = 63; // h8
export const BLACK_QUEENSIDE_ROOK_ORIGIN_SQUARE = 56; // a8

// King destination squares
export const WHITE_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE = 6; // g1
export const WHITE_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE = 2; // c1
export const BLACK_KING_KINGSIDE_CASTLE_DESTINATION_SQUARE = 62; // g8
export const BLACK_KING_QUEENSIDE_CASTLE_DESTINATION_SQUARE = 58; // c8

// Rook destination squares
export const WHITE_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE = 5; // f1
export const WHITE_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE = 3; // d1;
export const BLACK_ROOK_KINGSIDE_CASTLE_DESTINATION_SQUARE = 61; // f8
export const BLACK_ROOK_QUEENSIDE_CASTLE_DESTINATION_SQUARE = 59; // d8;

const generateCastlingMoves = (ctx: MoveGenerationContext, attackInfo: AttackInfo): void => {
  if (attackInfo.checkCount !== 0) {
    return;
  }

  // White castling
  if (ctx.color === COLOR.WHITE) {
    whiteKingsideCastling(ctx, attackInfo);
    whiteQueenCastling(ctx, attackInfo);

    return;
  }

  // Black castling
  blackKingsideCastling(ctx, attackInfo);
  blackQueenCastling(ctx, attackInfo);

  return;
}

export default generateCastlingMoves;