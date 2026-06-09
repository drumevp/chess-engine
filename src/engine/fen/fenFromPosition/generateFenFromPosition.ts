/**
 * FEN STRING LAYOUT
 * 1) 8 ranks info divided by "/"
 * 2) w or b -> whose turn it is
 * 3) KQkq -> castling rights. if no queenside castling is allowed, a letter is removed. if nobdy can castle, it turns into -
 * 4) en passant square -> "-" is null. if there is one it will be e4 or d5 or whatever. gotta conver that to a square
 * 5) halfmove clock
 * 6) fullmove number (starting from 1)
 *
 * EX: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
 * If the knight from b1 moves to c3, the FEN string looks like this
 * rnbqkbnr/pppppppp/8/8/8/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 1
 *
 */

import type { Position } from "../../types/main";
import { INTERNAL_COLOR_TO_FEN_COLOR } from "./constants";
import getFenCastlingFromPosition from "./helpers/getFenCastlingFromPosition";
import getFenEnPassantSquareFromPosition from "./helpers/getFenEnPassantSquareFromPosition";
import getFenPiecesFromPosition from "./helpers/getFenPiecesFromPosition";
const generateFenFromPosition = (position: Position): string => {
  let fenString: string = '';

  /**
   * BOARD PIECES STATE
   */
  fenString = fenString + getFenPiecesFromPosition(position) + ' ';

  /**
   * COLOR (side to move)
   */
  fenString = fenString + INTERNAL_COLOR_TO_FEN_COLOR[position.color] + ' ';

  /**
   * CASTLING RIGHTS
   */
  fenString = fenString + getFenCastlingFromPosition(position) + ' ';

  /**
   * EN PASSANT SQUARE
   */
  fenString = fenString + getFenEnPassantSquareFromPosition(position) + ' ';

  /**
   * HALFMOVE CLOCK
   */
  fenString = fenString + position.halfMoveClock.toString() + ' ';

  /**
   * FULLMOVE NUMBER
   */

  fenString = fenString + position.fullMoveNumber.toString();


  return fenString;
};

export default generateFenFromPosition;
