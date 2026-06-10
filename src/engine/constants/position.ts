/**
 * Define Bitboards for initial board state.
 * Using 64bit integers (HEX), we define the squares occupied for each category of piece for each color
 *
 * EXAMPLE: whiteRookBitboard = 0x0000000000000081n;
 * HEX:   H  G  F  E  |  D  C  B  A
 * VALUE: 8  4  2  1  |  8  4  2  1
 *
 * Since the white rooks live on the A file, we look at the last 2 digits of the hexadecimal value.
 * The right value covers the ABCD values, the left value covers EFGH.
 * A bit counterintuitive since it is read left to right.
 * Since the white rooks live on A1 and H1, we get the values:
 * 8 * 1 = 8 (H1 rook), 1 * 1 = 1 (A1 rook)
 *
 * This directly translates to 1000 0001 in binary
 */

import { Bitboard } from "../types/bitboard";

// Rooks on A1 and H1
const whiteRookBitboard: Bitboard = 0x0000000000000081n;

// knight on B1 and G1
const whiteKnightBitboard: Bitboard = 0x0000000000000042n;

// Bishops on C1 and F1
const whiteBishopBitboard: Bitboard = 0x0000000000000024n;

// Queen on D1
const whiteQueenBitboard: Bitboard = 0x0000000000000008n;

// King on E1
const whiteKingBitboard: Bitboard = 0x0000000000000010n;

// Pawns on A2-H2
const whitePawnsBitboard: Bitboard = 0x000000000000ff00n;

// Rooks on A8 and H8
const blackRookBitboard: Bitboard = 0x8100000000000000n;

// Knight on B8 and G8
const blackKnightBitboard: Bitboard = 0x4200000000000000n;

// Bishops on C8 and F8
const blackBishopBitboard: Bitboard = 0x2400000000000000n;

// Queen on D8
const blackQueenBitboard: Bitboard = 0x0800000000000000n;

// King on E8
const blackKingBitboard: Bitboard = 0x1000000000000000n;

// Pawns on A7-H7
const blackPawnsBitboard: Bitboard = 0x00ff000000000000n;

export const INITIAL_STATE: Bitboard[] = [
  whiteRookBitboard,
  whiteKnightBitboard,
  whiteBishopBitboard,
  whiteQueenBitboard,
  whiteKingBitboard,
  whitePawnsBitboard,
  blackRookBitboard,
  blackKnightBitboard,
  blackBishopBitboard,
  blackQueenBitboard,
  blackKingBitboard,
  blackPawnsBitboard,
];
