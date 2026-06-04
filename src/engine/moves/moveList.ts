/**
 * Definitions to pass moves into generateLegalMoves. This is to avoid creating new array objects
 * on every perft run, but rather mutate a higher level state array.
 */

export const MAX_MOVES = 256;

export type MoveList = {
  moves: Uint32Array;
  count: number;
};

export const createMoveList = (): MoveList => ({
  moves: new Uint32Array(MAX_MOVES),
  count: 0,
});

export const addMove = (list: MoveList, move: number): void => {
  list.moves[list.count++] = move;
};
