import { calculatePieceIndex } from "../../state/initialState";
import { COLOR, ColorType } from "../../types/main";
import {
  BISHOP_INDEX,
  KING_INDEX,
  KNIGHT_INDEX,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../../state/initialState";

export const INTERNAL_PIECE_TO_FEN_PIECE: Record<
  number,
  string
> = {
  [calculatePieceIndex(COLOR.WHITE, ROOK_INDEX)]: 'R',
  [calculatePieceIndex(COLOR.WHITE, KNIGHT_INDEX)]: 'N',
  [calculatePieceIndex(COLOR.WHITE, BISHOP_INDEX)]: 'B',
  [calculatePieceIndex(COLOR.WHITE, QUEEN_INDEX)]: 'Q',
  [calculatePieceIndex(COLOR.WHITE, KING_INDEX)]: 'K',
  [calculatePieceIndex(COLOR.WHITE, PAWN_INDEX)]: 'P',
  [calculatePieceIndex(COLOR.BLACK, ROOK_INDEX)]: 'r',
  [calculatePieceIndex(COLOR.BLACK, KNIGHT_INDEX)]: 'n',
  [calculatePieceIndex(COLOR.BLACK, BISHOP_INDEX)]: 'b',
  [calculatePieceIndex(COLOR.BLACK, QUEEN_INDEX)]: 'q',
  [calculatePieceIndex(COLOR.BLACK, KING_INDEX)]: 'k',
  [calculatePieceIndex(COLOR.BLACK, PAWN_INDEX)]: 'p',
};

export const INTERNAL_COLOR_TO_FEN_COLOR: Record<ColorType, string> = {
  [COLOR.WHITE]: 'w',
  [COLOR.BLACK]: 'b',
};

export const INTERNAL_FILE_TO_FEN_FILE: Record<number, string> = {
  0: 'a',
  1: 'b',
  2: 'c',
  3: 'd',
  4: 'e',
  5: 'f',
  6: 'g',
  7: 'h',
}