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

// Rooks on A1 and H1
const whiteRookBitboardLo: number = 0x00000081;
const whiteRookBitboardHi: number = 0x00000000;

// knight on B1 and G1
const whiteKnightBitboardLo: number = 0x00000042;
const whiteKnightBitboardHi: number = 0x00000000;

// Bishops on C1 and F1
const whiteBishopBitboardLo: number = 0x00000024;
const whiteBishopBitboardHi: number = 0x00000000;

// Queen on D1
const whiteQueenBitboardLo: number = 0x00000008;
const whiteQueenBitboardHi: number = 0x00000000;

// King on E1
const whiteKingBitboardLo: number = 0x00000010;
const whiteKingBitboardHi: number = 0x00000000;

// Pawns on A2-H2
const whitePawnsBitboardLo: number = 0x0000ff00;
const whitePawnsBitboardHi: number = 0x00000000;

// Rooks on A8 and H8
const blackRookBitboardLo: number = 0x00000000;
const blackRookBitboardHi: number = 0x81000000;

// Knight on B8 and G8
const blackKnightBitboardLo: number = 0x00000000;
const blackKnightBitboardHi: number = 0x42000000;

// Bishops on C8 and F8
const blackBishopBitboardLo: number = 0x00000000;
const blackBishopBitboardHi: number = 0x24000000;

// Queen on D8
const blackQueenBitboardLo: number = 0x00000000;
const blackQueenBitboardHi: number = 0x08000000;

// King on E8
const blackKingBitboardLo: number = 0x00000000;
const blackKingBitboardHi: number = 0x10000000;

// Pawns on A7-H7
const blackPawnsBitboardLo: number = 0x00000000;
const blackPawnsBitboardHi: number = 0x00ff0000;

export const INITIAL_STATE_LO: Uint32Array = new Uint32Array([
  whiteRookBitboardLo,
  whiteKnightBitboardLo,
  whiteBishopBitboardLo,
  whiteQueenBitboardLo,
  whiteKingBitboardLo,
  whitePawnsBitboardLo,
  blackRookBitboardLo,
  blackKnightBitboardLo,
  blackBishopBitboardLo,
  blackQueenBitboardLo,
  blackKingBitboardLo,
  blackPawnsBitboardLo,
]);

export const INITIAL_STATE_HI: Uint32Array = new Uint32Array([
  whiteRookBitboardHi,
  whiteKnightBitboardHi,
  whiteBishopBitboardHi,
  whiteQueenBitboardHi,
  whiteKingBitboardHi,
  whitePawnsBitboardHi,
  blackRookBitboardHi,
  blackKnightBitboardHi,
  blackBishopBitboardHi,
  blackQueenBitboardHi,
  blackKingBitboardHi,
  blackPawnsBitboardHi,
]);
