import { moveEEN, moveEES, moveNNE, moveNNW, moveSSE, moveSSW, moveWWN, moveWWS } from "../constants/movement"
/**
 * 
 * A king can move 1 square in any direction.
 * We need to take the current position, apply movement in all direction and combine them
 * excluding the original square
 */

export const moveKnightInAllDirections = (bitboard: bigint): bigint => {
  const movementFns = [moveNNW, moveNNE, moveWWN, moveWWS, moveSSW, moveSSE, moveEEN, moveEES];

  return movementFns.reduce((collectionOfLegalMoves, fn) => {
    return collectionOfLegalMoves | fn(bitboard)
  }, 0n);
}

export const knightLookupTable: bigint[] = [];

let currentPositionBitboard: bigint = 0x1n;

for(let i = 0; i < 64; i++) {
  knightLookupTable[i] = moveKnightInAllDirections(currentPositionBitboard);
  
  currentPositionBitboard = currentPositionBitboard << 1n;
}
