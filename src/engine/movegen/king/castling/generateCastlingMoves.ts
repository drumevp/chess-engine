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

import { COLOR } from "../../../constants/color";
import { AttackInfo } from "../../../types/attackInfo";
import { MoveGenerationContext } from "../../../types/move";
import blackKingsideCastling from "./blackKingsideCastling";
import blackQueenCastling from "./blackQueensideCastling";
import whiteKingsideCastling from "./whiteKingsideCastling";
import whiteQueenCastling from "./whiteQueensideCastling";

const generateCastlingMoves = (
  ctx: MoveGenerationContext,
  attackInfo: AttackInfo,
): void => {
  if (attackInfo.checkCount !== 0) {
    return;
  }

  // White castling
  if (ctx.color === COLOR.WHITE) {
    whiteKingsideCastling(ctx);
    whiteQueenCastling(ctx);

    return;
  }

  // Black castling
  blackKingsideCastling(ctx);
  blackQueenCastling(ctx);

  return;
};

export default generateCastlingMoves;
