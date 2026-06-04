import type { Position } from "../types/main";
import generateLegalMoves from "./generateLegalMoves";
import { createMoveList } from "./moveList";

const generateLegalMovesWrapper = (position: Position): Uint32Array => {
  const moveList = createMoveList();
  generateLegalMoves(position, moveList);

  return moveList.moves.slice(0, moveList.count);
};

export default generateLegalMovesWrapper;
