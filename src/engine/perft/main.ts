/**
 * Counting the legal moves for a certain depth.
 * Updated this so we don't create any new array objects on each iteration for performance.
 */

import makeMove from "../makeMove/makeMove";
import generateLegalMoves from "../moves/generateLegalMoves";
import { createMoveList, type MoveList } from "../moves/moveList";
import type { Position } from "../types/main";
import undoMove from "../undoMove/main";

const perftRecursive = (
  position: Position,
  depth: number,
  ply: number,
  moveLists: MoveList[],
): number => {
  if (depth <= 0) {
    return 1;
  }

  const moveList = moveLists[ply];
  const count = generateLegalMoves(position, moveList);

  if (depth === 1) {
    return count;
  }

  let nodes = 0;

  for (let i = 0; i < count; i++) {
    const move = moveList.moves[i];

    const undo = makeMove(position, move);
    nodes += perftRecursive(position, depth - 1, ply + 1, moveLists);
    undoMove(position, move, undo);
  }

  return nodes;
};

const perft = (position: Position, depth: number): number => {
  const moveLists = Array.from({ length: depth }, () => createMoveList());

  return perftRecursive(position, depth, 0, moveLists);
};

export default perft;
