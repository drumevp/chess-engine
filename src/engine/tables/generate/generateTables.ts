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
 */

import generateBetweenSquaresTable from "./generateBetweenSquaresTable";
import { E, moveEEN, moveEES, moveNNE, moveNNW, moveSSE, moveSSW, moveWWN, moveWWS, N, NE, NW, S, SE, SW, W } from "../../helpers/movement";
import { bishopMagic, bishopMagicIndexedAttackTable } from "./bishop/magic";
import { bishopRelevantBlockerMask } from "./bishop/relevantBlockerMask";
import { bishopShift } from "./bishop/shift";
import { rookMagic, rookMagicIndexedAttackTable } from "./rook/magic";
import { rookRelevantBlockerMask } from "./rook/relevantBlockerMask";
import { rookShift } from "./rook/shift";
import { Bitboard } from "../../types/bitboard";


// King
export const kingLookupTable: Bitboard[] = [];
export const kingMovementFns = [N, E, W, S, NE, NW, SE, SW];

// Knight
export const knightLookupTable: Bitboard[] = [];
export const knightMovementFns = [moveNNW, moveNNE, moveWWN, moveWWS, moveSSW, moveSSE, moveEEN, moveEES];

// White Pawn
export const whitePawnAttackTable: Bitboard[] = [];
export const whitePawnMovementFns = [NW, NE];

// Black Pawn
export const blackPawnAttackTable: Bitboard[] = [];
export const blackPawnMovementFns = [SW, SE];

export const shift = (bitboard: Bitboard, movementFns: ((bitboard: Bitboard) => Bitboard)[]): Bitboard => {
  return movementFns.reduce((collectionOfLegalMoves, fn) => {
    return collectionOfLegalMoves | fn(bitboard)
  }, 0n);
}

let currentPositionBitboard: Bitboard = 0x1n;

for(let i = 0; i < 64; i++) {
  kingLookupTable[i] = shift(currentPositionBitboard, kingMovementFns);
  knightLookupTable[i] = shift(currentPositionBitboard, knightMovementFns);
  whitePawnAttackTable[i] = shift(currentPositionBitboard, whitePawnMovementFns);
  blackPawnAttackTable[i] = shift(currentPositionBitboard, blackPawnMovementFns);
  
  currentPositionBitboard = currentPositionBitboard << 1n;
}

// Square bitboards to target specific squares

const squareBitboards: Bitboard[] = new Array(64);

for(let i = 0; i < 64; i++) {
  const value = 1n << BigInt(i);

  squareBitboards[i] = value;
}

// inverted squareBitboards
export const squareIndexByBitboard = new Map<Bitboard, number>();

for (let i = 0; i < 64; i++) {
  squareIndexByBitboard.set(squareBitboards[i], i);
}

const betweenSquares = generateBetweenSquaresTable();

export default {
  kingAttacks: kingLookupTable,
  knightAttacks: knightLookupTable,
  whitePawnAttacks: whitePawnAttackTable,
  blackPawnAttacks: blackPawnAttackTable,
  rookRelevantBlockerMasks: rookRelevantBlockerMask,
  rookShifts: rookShift,
  rookMagicNumbers: rookMagic,
  rookMagicAttacks: rookMagicIndexedAttackTable,
  bishopRelevantBlockerMasks: bishopRelevantBlockerMask,
  bishopShifts: bishopShift,
  bishopMagicNumbers: bishopMagic,
  bishopMagicAttacks: bishopMagicIndexedAttackTable,
  squareBitboards,
  squareIndexByBitboard,
  betweenSquares,
}