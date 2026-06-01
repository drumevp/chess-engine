export const COLOR = {
  WHITE: 0,
  BLACK: 1,
} as const;

export type ColorType = typeof COLOR[keyof typeof COLOR];

export const MOVE_FLAG = {
  QUIET: 0,
  CAPTURE: 1,
  DOUBLE_PAWN_PUSH: 2,
  KING_CASTLE: 3,
  QUEEN_CASTLE: 4,
  EN_PASSANT: 5,
  PROMOTION: 6,
  PROMOTION_CAPTURE: 7,
} as const;

export type MoveFlagType = typeof MOVE_FLAG[keyof typeof MOVE_FLAG];

export type Move = {
  from: number;
  to: number;

  color: ColorType;
  piece: number;

  capturedPiece?: number;
  promotionPiece?: number;

  flag: MoveFlagType;
};

export type Position = {
  // 12 bitboards representing the state for each piece on each color
  state: bigint[]; 

  // Occupancy
  allOccupancy: bigint;
  whiteOccupancy: bigint;
  blackOccupancy: bigint;

  // Side to move
  color: ColorType;

  // Castling rights
  // 4 bit values where each bit represents whether
  // 1111
  // lowest bit -> WHITE KINGSIDE, WHITE QUEENSIDE, BLACK KINGSIDE, BLACK QUEENSIDE
  castlingRights: number;

  // En pessant square (index on board)
  enPassantSquare: number | null;

  // If 50 moves are made without a capture or a pawn move, game ends in a draw
  halfMoveClock: number;

  // Increments each time black makes a move
  fullMoveNumber: number;

  // Represents the position of each piece on the board for quick lookups
  // White pieces are 0-6, black pieces are 7-12. -1 are empty squares
  pieceAt: Int8Array;

  // Array of 2 values. kingSquare[0] -> white, kingSquare[1] -> black
  kingSquares: Int8Array;
}