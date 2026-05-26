import { moveEast, moveNorth, moveNorthEast, moveNorthWest, moveSouth, moveSouthEast, moveSouthWest, moveWest } from "../constants/movement";

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
  const northMovement = moveNorth(bitboard);
  const eastMovement = moveEast(bitboard);
  const westMovement = moveWest(bitboard);
  const southMovement = moveSouth(bitboard);
  const northEastMovement = moveNorthEast(bitboard);
  const northWestMovement = moveNorthWest(bitboard);
  const southEastMovement = moveSouthEast(bitboard);
  const southWestMovement = moveSouthWest(bitboard);

  return northMovement | eastMovement | westMovement | southMovement | northEastMovement | northWestMovement | southEastMovement | southWestMovement;
}

// Length = 64 (one for each square on the board)
export const kingLookupTable: bigint[] = [];

let currentPositionBitboard: bigint = 0x1n;

for(let i = 0; i < 64; i++) {
  kingLookupTable[i] = moveOneStepInAllDirections(currentPositionBitboard);
  
  currentPositionBitboard = currentPositionBitboard << 1n;
}

