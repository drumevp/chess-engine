/**
 * 
  * K Q - white kingside and queenside
  * k q - black kingside and queenside
  * all castling allowed string = KQkq
  * of no castling allowed -> '-'
 */

import { CASTLING_RIGHTS } from "../../../constants/castling";
import { Position } from "../../../types/position";

const getFenCastlingFromPosition = (position: Position): string => {
  if (position.castlingRights === 0) {
    return '-';
  }

  let castlingFenString = '';

  const canWhiteCastleKingside = (position.castlingRights & CASTLING_RIGHTS.WHITE_KINGSIDE) > 0;
  const canWhiteCastleQueenside = (position.castlingRights & CASTLING_RIGHTS.WHITE_QUEENSIDE) > 0;
  const canBlackCastleKingside = (position.castlingRights & CASTLING_RIGHTS.BLACK_KINGSIDE) > 0;
  const canBlackCastleQueenside = (position.castlingRights & CASTLING_RIGHTS.BLACK_QUEENSIDE) > 0;

  if (canWhiteCastleKingside) {
    castlingFenString = castlingFenString + 'K';
  }

  if (canWhiteCastleQueenside) {
    castlingFenString = castlingFenString + 'Q';
  }

  if (canBlackCastleKingside) {
    castlingFenString = castlingFenString + 'k';
  }

  if (canBlackCastleQueenside) {
    castlingFenString = castlingFenString + 'q';
  }

  return castlingFenString;
}

export default getFenCastlingFromPosition;