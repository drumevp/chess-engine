/**
 * This is to generate an array of pseudo legal attack moves for each square on the board
 * They're pseudo legal, since they do not yet take into account the board state and occupancy
 * We start off with 0x1n (1) in binary.
 * We move the king in all directions and combine the resulting bitboards
 * IF
 * [
 *  0  0  0
 *  0  1  0 - - - - > 1 = king position
 *  0  0  0
 * ]
 * RESULT
 * [
 *  1  1  1
 *  1  0  1 - - - - > 1 = king position
 *  1  1  1
 * ]
 *
 * We apply rules for the A and H files and ranks 1 and 8 so we don't go over the boundaries of the board
 *
 *
 * After each iteration, we shift the bit by one
 * [iteration index] [position] [binary]
 *           0           a1        1
 *           1           b1        10
 *           2           c1        100
 *           3           d1        1000
 *
 *
 * 32 BIT REFACTOR
 * Rather than updating all the functions to calculate Lo and Hi,
 * I will split the resulting bb to Lo and Hi and store the Lo and Hi tables
 *
 * Any 2D array, I will flatten to a 1D array and perform access another way.
 * The performance of the bigint engine was lowered by the performance cost of accessing 2D arrays, it adds overhead.
 */

import generateBetweenSquaresTable from "./generateBetweenSquaresTable";
import {
  E,
  moveEEN,
  moveEES,
  moveNNE,
  moveNNW,
  moveSSE,
  moveSSW,
  moveWWN,
  moveWWS,
  N,
  NE,
  NW,
  S,
  SE,
  SW,
  W,
} from "../../helpers/movement";
import { bishopMagic, bishopMagicIndexedAttackTable } from "./bishop/magic";
import { bishopRelevantBlockerMask } from "./bishop/relevantBlockerMask";
import { bishopShift } from "./bishop/shift";
import { rookMagic, rookMagicIndexedAttackTable } from "./rook/magic";
import { rookRelevantBlockerMask } from "./rook/relevantBlockerMask";
import { rookShift } from "./rook/shift";
import { Bitboard } from "../../types/bitboard";
import { NUMBER_OF_PIECE_CATEGORIES } from "../../constants/piece";
import { random64bit } from "../../helpers/main";
import { LOWER_32_BITS_MASK } from "../../constants/mask";

const splitBitboard = (bitboard: Bitboard): { lo: number; hi: number } => {
  return {
    lo: Number(bitboard & LOWER_32_BITS_MASK) >>> 0,
    hi: Number((bitboard >> 32n) & LOWER_32_BITS_MASK) >>> 0,
  };
};

// King
export const kingMovementFns = [N, E, W, S, NE, NW, SE, SW];

const kingLookupTableLo: Uint32Array = new Uint32Array(64);
const kingLookupTableHi: Uint32Array = new Uint32Array(64);

// Knight
const knightLookupTableLo: Uint32Array = new Uint32Array(64);
const knightLookupTableHi: Uint32Array = new Uint32Array(64);
export const knightMovementFns = [
  moveNNW,
  moveNNE,
  moveWWN,
  moveWWS,
  moveSSW,
  moveSSE,
  moveEEN,
  moveEES,
];

// White Pawn
const whitePawnLookupTableLo: Uint32Array = new Uint32Array(64);
const whitePawnLookupTableHi: Uint32Array = new Uint32Array(64);
export const whitePawnMovementFns = [NW, NE];

// Black Pawn
const blackPawnLookupTableLo: Uint32Array = new Uint32Array(64);
const blackPawnLookupTableHi: Uint32Array = new Uint32Array(64);
export const blackPawnMovementFns = [SW, SE];

export const shift = (
  bitboard: Bitboard,
  movementFns: ((bitboard: Bitboard) => Bitboard)[],
): Bitboard => {
  return movementFns.reduce((collectionOfLegalMoves, fn) => {
    return collectionOfLegalMoves | fn(bitboard);
  }, 0n);
};

let currentPositionBitboard: Bitboard = 0x1n;

for (let i = 0; i < 64; i++) {
  const kingBitboard = shift(currentPositionBitboard, kingMovementFns);
  const { lo: kingBitboardLo, hi: kingBitboardHi } =
    splitBitboard(kingBitboard);
  kingLookupTableLo[i] = kingBitboardLo;
  kingLookupTableHi[i] = kingBitboardHi;

  const knightBitboard = shift(currentPositionBitboard, knightMovementFns);
  const { lo: knightBitboardLo, hi: knightBitboardHi } =
    splitBitboard(knightBitboard);
  knightLookupTableLo[i] = knightBitboardLo;
  knightLookupTableHi[i] = knightBitboardHi;

  const whitePawnBitboard = shift(
    currentPositionBitboard,
    whitePawnMovementFns,
  );
  const { lo: whitePawnBitboardLo, hi: whitePawnBitboardHi } =
    splitBitboard(whitePawnBitboard);
  whitePawnLookupTableLo[i] = whitePawnBitboardLo;
  whitePawnLookupTableHi[i] = whitePawnBitboardHi;

  const blackPawnBitboard = shift(
    currentPositionBitboard,
    blackPawnMovementFns,
  );
  const { lo: blackPawnBitboardLo, hi: blackPawnBitboardHi } =
    splitBitboard(blackPawnBitboard);
  blackPawnLookupTableLo[i] = blackPawnBitboardLo;
  blackPawnLookupTableHi[i] = blackPawnBitboardHi;

  currentPositionBitboard = currentPositionBitboard << 1n;
}

// Square bitboards to target specific squares

const squareBitboards: Bitboard[] = new Array(64);

for (let i = 0; i < 64; i++) {
  const value = 1n << BigInt(i);

  squareBitboards[i] = value;
}

// inverted squareBitboards
export const squareIndexByBitboard = new Map<Bitboard, number>();

for (let i = 0; i < 64; i++) {
  squareIndexByBitboard.set(squareBitboards[i], i);
}

const betweenSquares = generateBetweenSquaresTable();

/**
 * Zobrist hashing tables
 * https://www.chessprogramming.org/Zobrist_Hashing
 *
 * zobristPieceSquareKeys - We generate a random hash for each piece on each square
 * zobristBlackToMoveKey - One random hash if it is blacks turn
 * zobristCastlingMaskKey - Since we store the castling rights as a number with 4 bits - 1111 = MAX (8 + 4 + 2 + 1) = 15 + 1(for zero state) = 16  possible values
 * zobristEnPassantFileKeys - There can be only ONE en passant value per turn and it is on a specific file, since there are 8 files, we generate 8 values
 */
let zobristPieceSquareKeys: Bitboard[][] = new Array(
  NUMBER_OF_PIECE_CATEGORIES * 2,
);
let zobristBlackToMoveKey: Bitboard = random64bit();
let zobristCastlingMaskKeys: Bitboard[] = [];
let zobristEnPassantFileKeys: Bitboard[] = [];

for (
  let pieceIndex = 0;
  pieceIndex < NUMBER_OF_PIECE_CATEGORIES * 2;
  pieceIndex++
) {
  const squareValuesArray = new Array(64);

  for (let square = 0; square < 64; square++) {
    squareValuesArray[square] = random64bit();
  }

  zobristPieceSquareKeys[pieceIndex] = squareValuesArray;
}

for (
  let castlingRightsValue = 0;
  castlingRightsValue < 16;
  castlingRightsValue++
) {
  zobristCastlingMaskKeys[castlingRightsValue] = random64bit();
}

for (let file = 0; file < 8; file++) {
  zobristEnPassantFileKeys[file] = random64bit();
}

/**
 * Convert rook and bishop relevant blocker masks to Lo and Hi
 * Rook and bishop magic numbers Lo and Hi
 */
const rookRelevantBlockerMaskLo: Uint32Array = new Uint32Array(64);
const rookRelevantBlockerMaskHi: Uint32Array = new Uint32Array(64);

const bishopRelevantBlockerMaskLo: Uint32Array = new Uint32Array(64);
const bishopRelevantBlockerMaskHi: Uint32Array = new Uint32Array(64);

// Magic numbers
const rookMagicLo: Uint32Array = new Uint32Array(64);
const rookMagicHi: Uint32Array = new Uint32Array(64);

const bishopMagicLo: Uint32Array = new Uint32Array(64);
const bishopMagicHi: Uint32Array = new Uint32Array(64);

for (let i = 0; i < 64; i++) {
  // Rook blocker mask
  const rookBlockerMaskBitboard = rookRelevantBlockerMask[i];

  const { lo: rookBlockerMaskBitboardLo, hi: rookBlockerMaskBitboardHi } =
    splitBitboard(rookBlockerMaskBitboard);

  rookRelevantBlockerMaskLo[i] = rookBlockerMaskBitboardLo;
  rookRelevantBlockerMaskHi[i] = rookBlockerMaskBitboardHi;

  // Bishop blocker mask
  const bishopBlockerMaskBitboard = bishopRelevantBlockerMask[i];

  const { lo: bishopBlockerMaskBitboardLo, hi: bishopBlockerMaskBitboardHi } =
    splitBitboard(bishopBlockerMaskBitboard);

  bishopRelevantBlockerMaskLo[i] = bishopBlockerMaskBitboardLo;
  bishopRelevantBlockerMaskHi[i] = bishopBlockerMaskBitboardHi;

  // Rook magic
  const rookMagicBitboard = rookMagic[i];

  const { lo: rookMagicBitboardLo, hi: rookMagicBitboardHi } =
    splitBitboard(rookMagicBitboard);

  rookMagicLo[i] = rookMagicBitboardLo;
  rookMagicHi[i] = rookMagicBitboardHi;

  // Bishop magic
  const bishopMagicBitboard = bishopMagic[i];

  const { lo: bishopMagicBitboardLo, hi: bishopMagicBitboardHi } =
    splitBitboard(bishopMagicBitboard);

  bishopMagicLo[i] = bishopMagicBitboardLo;
  bishopMagicHi[i] = bishopMagicBitboardHi;
}

/**
 * Rook & bishop magic attacks
 *
 * I am converting this to a 1D array to avoid the compute overhead from accessing the 2D array I earlier discovered.
 * To be able to access it I need to know how many attacks there are for each square index, so I will store this in a
 * separate table rookMagicAttackOffsets for ease of access later on.
 *
 *
 */

const rookMagicAttackOffsets: Uint32Array = new Uint32Array(64);

let totalRookAttackEntries = 0;

for (let square = 0; square < 64; square++) {
  rookMagicAttackOffsets[square] = totalRookAttackEntries;
  totalRookAttackEntries += rookMagicIndexedAttackTable[square].length;
}

const rookMagicAttacksLo: Uint32Array = new Uint32Array(totalRookAttackEntries);
const rookMagicAttacksHi: Uint32Array = new Uint32Array(totalRookAttackEntries);

for (let square = 0; square < 64; square++) {
  const offset = rookMagicAttackOffsets[square];
  const attacks = rookMagicIndexedAttackTable[square];

  for (let attackIndex = 0; attackIndex < attacks.length; attackIndex++) {
    const attackBitboard = attacks[attackIndex];

    const { lo: attackBitboardLo, hi: attackBitboardHi } =
      splitBitboard(attackBitboard);

    rookMagicAttacksLo[offset + attackIndex] = attackBitboardLo;
    rookMagicAttacksHi[offset + attackIndex] = attackBitboardHi;
  }
}

const bishopMagicAttackOffsets: Uint32Array = new Uint32Array(64);

let totalBishopAttackEntries = 0;

for (let square = 0; square < 64; square++) {
  bishopMagicAttackOffsets[square] = totalBishopAttackEntries;
  totalBishopAttackEntries += bishopMagicIndexedAttackTable[square].length;
}

const bishopMagicAttacksLo: Uint32Array = new Uint32Array(
  totalBishopAttackEntries,
);
const bishopMagicAttacksHi: Uint32Array = new Uint32Array(
  totalBishopAttackEntries,
);

for (let square = 0; square < 64; square++) {
  const offset = bishopMagicAttackOffsets[square];
  const attacks = bishopMagicIndexedAttackTable[square];

  for (let attackIndex = 0; attackIndex < attacks.length; attackIndex++) {
    const attackBitboard = attacks[attackIndex];

    const { lo: attackBitboardLo, hi: attackBitboardHi } =
      splitBitboard(attackBitboard);

    bishopMagicAttacksLo[offset + attackIndex] = attackBitboardLo;
    bishopMagicAttacksHi[offset + attackIndex] = attackBitboardHi;
  }
}

export default {
  kingAttacksLo: kingLookupTableLo,
  kingAttacksHi: kingLookupTableHi,
  knightAttacksLo: knightLookupTableLo,
  knightAttacksHi: knightLookupTableHi,
  whitePawnAttacksLo: whitePawnLookupTableLo,
  whitePawnAttacksHi: whitePawnLookupTableHi,
  blackPawnAttacksLo: blackPawnLookupTableLo,
  blackPawnAttacksHi: blackPawnLookupTableHi,
  rookRelevantBlockerMasksLo: rookRelevantBlockerMaskLo,
  rookRelevantBlockerMasksHi: rookRelevantBlockerMaskHi,
  rookShifts: rookShift,
  rookMagicNumbersLo: rookMagicLo,
  rookMagicNumbersHi: rookMagicHi,
  rookMagicAttackOffsets: rookMagicAttackOffsets,
  rookMagicAttacksLo: rookMagicAttacksLo,
  rookMagicAttacksHi: rookMagicAttacksHi,
  bishopRelevantBlockerMasksLo: bishopRelevantBlockerMaskLo,
  bishopRelevantBlockerMasksHi: bishopRelevantBlockerMaskHi,
  bishopShifts: bishopShift,
  bishopMagicNumbersLo: bishopMagicLo,
  bishopMagicNumbersHi: bishopMagicHi,
  bishopMagicAttackOffsets: bishopMagicAttackOffsets,
  bishopMagicAttacksLo: bishopMagicAttacksLo,
  bishopMagicAttacksHi: bishopMagicAttacksHi,

  // TODO:
  squareBitboards,
  squareIndexByBitboard,
  betweenSquares,
  zobristPieceSquareKeys,
  zobristBlackToMoveKey,
  zobristCastlingMaskKeys,
  zobristEnPassantFileKeys,
};
