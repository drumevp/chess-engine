import { E, N, NE, NW, S, SE, SW, W } from "../constants/movement";

/**
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

/**
 * 
 * A king can move 1 square in any direction.
 * We need to take the current position, apply movement in all direction and combine them
 * excluding the original square
 */
export const moveOneStepInAllDirections = (bitboard: bigint): bigint => {
  const movementFns = [N, E, W, S, NE, NW, SE, SW];

    return movementFns.reduce((collectionOfLegalMoves, fn) => {
    return collectionOfLegalMoves | fn(bitboard)
  }, 0n);
}

// Length = 64 (one for each square on the board)
export const kingLookupTable: bigint[] = [];

let currentPositionBitboard: bigint = 0x1n;

for(let i = 0; i < 64; i++) {
  kingLookupTable[i] = moveOneStepInAllDirections(currentPositionBitboard);
  
  currentPositionBitboard = currentPositionBitboard << 1n;
}

