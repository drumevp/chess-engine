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

export const COLOR = {
  WHITE: 0,
  BLACK: 1,
} as const;

export type ColorType = typeof COLOR[keyof typeof COLOR];

const NUMBER_OF_PIECE_CATEGORIES = 6;

export const ROOK_INDEX: number = 0;
export const HORSE_INDEX: number = 1;
export const BISHOP_INDEX: number = 2;
export const QUEEN_INDEX: number = 3;
export const KING_INDEX: number = 4;
export const PAWN_INDEX: number = 5;

export const calculatePieceIndex = (color: ColorType, index: number) => {
  return (color * NUMBER_OF_PIECE_CATEGORIES) + index;
}

// Rooks on A1 and H1
const whiteRookBitboard: bigint = 0x0000000000000081n;

// Horses on B1 and G1
const whiteHorseBitboard: bigint = 0x0000000000000042n;

// Bishops on C1 and F1
const whiteBishopBitboard: bigint = 0x0000000000000024n;

// Queen on D1
const whiteQueenBitboard: bigint = 0x0000000000000008n;

// King on E1
const whiteKingBitboard: bigint = 0x0000000000000010n;

// Pawns on A2-H2
const whitePawnsBitboard: bigint = 0x000000000000ff00n;

// Rooks on A8 and H8
const blackRookBitboard: bigint = 0x8100000000000000n;

// Horses on B8 and G8
const blackHorseBitboard: bigint = 0x4200000000000000n;

// Bishops on C8 and F8
const blackBishopBitboard: bigint = 0x2400000000000000n;

// Queen on D8
const blackQueenBitboard: bigint = 0x0800000000000000n;

// King on E8
const blackKingBitboard: bigint = 0x1000000000000000n;

// Pawns on A7-H7
const blackPawnsBitboard: bigint = 0x00ff000000000000n;


export const INITIAL_STATE: bigint[] = [
  whiteRookBitboard,
  whiteHorseBitboard,
  whiteBishopBitboard,
  whiteQueenBitboard,
  whiteKingBitboard,
  whitePawnsBitboard,
  blackRookBitboard,
  blackHorseBitboard,
  blackBishopBitboard,
  blackQueenBitboard,
  blackKingBitboard,
  blackPawnsBitboard,
];
