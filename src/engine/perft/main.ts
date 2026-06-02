import makeMove from "../makeMove/makeMove";
import generateLegalMoves from "../moves/generateLegalMoves";
import type { Position } from "../types/main";
import undoMove from "../undoMove/main";

const perft = (position: Position, depth: number): number => {
  if (depth <= 0) {
    return 1;
  }

  const moves = generateLegalMoves(position);
  let nodes = 0;

  for(let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const undo = makeMove(position, move);
    nodes += perft(position, depth - 1);

    undoMove(position, move, undo);
  }

  return nodes;
}

export default perft;