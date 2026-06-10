/**
 * Definitions to pass moves into generateLegalMoves. This is to avoid creating new array objects
 * on every perft run, but rather mutate a higher level state array.
 */

import { MoveList } from "../types/move";

export const MAX_MOVES = 256;

export const createMoveList = (): MoveList => ({
  moves: new Uint32Array(MAX_MOVES),
  count: 0,
});

export const addMove = (list: MoveList, move: number): void => {
  list.moves[list.count++] = move;
};
