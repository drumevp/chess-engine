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

import { E, moveEEN, moveEES, moveNNE, moveNNW, moveSSE, moveSSW, moveWWN, moveWWS, N, NE, NW, S, SE, SW, W } from "../constants/movement";


// King
export const kingLookupTable: bigint[] = [];
export const kingMovementFns = [N, E, W, S, NE, NW, SE, SW];

// Knight
export const knightLookupTable: bigint[] = [];
export const knightMovementFns = [moveNNW, moveNNE, moveWWN, moveWWS, moveSSW, moveSSE, moveEEN, moveEES];

// White Pawn
export const whitePawnAttackTable: bigint[] = [];
export const whitePawnMovementFns = [NW, NE];

// Black Pawn
export const blackPawnAttackTable: bigint[] = [];
export const blackPawnMovementFns = [SW, SE];

export const shift = (bitboard: bigint, movementFns: ((bitboard: bigint) => bigint)[]): bigint => {
  return movementFns.reduce((collectionOfLegalMoves, fn) => {
    return collectionOfLegalMoves | fn(bitboard)
  }, 0n);
}

let currentPositionBitboard: bigint = 0x1n;

for(let i = 0; i < 64; i++) {
  kingLookupTable[i] = shift(currentPositionBitboard, kingMovementFns);
  knightLookupTable[i] = shift(currentPositionBitboard, knightMovementFns);
  whitePawnAttackTable[i] = shift(currentPositionBitboard, whitePawnMovementFns);
  blackPawnAttackTable[i] = shift(currentPositionBitboard, blackPawnMovementFns);
  
  currentPositionBitboard = currentPositionBitboard << 1n;
}