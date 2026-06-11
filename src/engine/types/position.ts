import { Bitboard } from "./bitboard";
import { ColorType } from "./color";

export type Position = {
  // 12 bitboards representing the state for each piece on each color
  state: Bitboard[];

  // Occupancy
  allOccupancy: Bitboard;
  whiteOccupancy: Bitboard;
  blackOccupancy: Bitboard;

  // Side to move
  color: ColorType;

  // Castling rights
  // 4 bit values where each bit represents whether the king can castle in a directions
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
};
