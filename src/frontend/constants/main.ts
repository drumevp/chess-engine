/**
export const ROOK_INDEX: number = 0;
export const KNIGHT_INDEX: number = 1;
export const BISHOP_INDEX: number = 2;
export const QUEEN_INDEX: number = 3;
export const KING_INDEX: number = 4;
export const PAWN_INDEX: number = 5;
*/

export const PIECE_STATE_INDEX_TO_BOARD_ITEM: Record<number, string> = {
  // White rook
  0: '♖',
  // White Knight
  1: '♘',
  // White Bishop
  2: '♗',
  // White Queen
  3: '♕',
  // White King
  4: '♔',
  // White Pawn
  5: '♙',

  // Black rook
  6: '♜',
  // Black Knight
  7: '♞',
  // Black Bishop
  8: '♝',
  // Black Queen
  9: '♛',
  // Black King
  10: '♚',
  // Black Pawn
  11: '♟',
}

export const COLOR = {
  WHITE: 'white',
  BLACK: 'black',
}