import {
  BISHOP_INDEX,
  KING_INDEX,
  KNIGHT_INDEX,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../state/initialState";
import { COLOR, type ColorType } from "../types/main";

// The ordering in the FEN string is from rank 7 to rank 0
export const FEN_RANK_TO_INTERNAL_RANK: Record<number, number> = {
  0: 7,
  1: 6,
  2: 5,
  3: 4,
  4: 3,
  5: 2,
  6: 1,
  7: 0,
};

// White piece are capital, black a lowercase
export const FEN_PIECE_TO_INTERNAL_PIECE: Record<
  string,
  { color: ColorType; pieceIndex: number }
> = {
  R: { color: COLOR.WHITE, pieceIndex: ROOK_INDEX },
  N: { color: COLOR.WHITE, pieceIndex: KNIGHT_INDEX },
  B: { color: COLOR.WHITE, pieceIndex: BISHOP_INDEX },
  Q: { color: COLOR.WHITE, pieceIndex: QUEEN_INDEX },
  K: { color: COLOR.WHITE, pieceIndex: KING_INDEX },
  P: { color: COLOR.WHITE, pieceIndex: PAWN_INDEX },
  r: { color: COLOR.BLACK, pieceIndex: ROOK_INDEX },
  n: { color: COLOR.BLACK, pieceIndex: KNIGHT_INDEX },
  b: { color: COLOR.BLACK, pieceIndex: BISHOP_INDEX },
  q: { color: COLOR.BLACK, pieceIndex: QUEEN_INDEX },
  k: { color: COLOR.BLACK, pieceIndex: KING_INDEX },
  p: { color: COLOR.BLACK, pieceIndex: PAWN_INDEX },
};

export const FEN_COLOR_TO_INTERNAL_COLOR: Record<string, ColorType> = {
  w: COLOR.WHITE,
  b: COLOR.BLACK,
};
