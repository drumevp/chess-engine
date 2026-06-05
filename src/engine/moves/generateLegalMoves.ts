import type { Position } from "../types/main";
import generateAttackInfo from "./attackInfo/main";
import generateLegalMovesFromContext from "./generateLegalMovesFromContext";
import generateMoveGenerationContext from "./generateMoveGenerationContext";
import { createMoveList } from "./moveList";

const generateLegalMoves = (position: Position): Uint32Array => {
  const moveList = createMoveList();
  const ctx = generateMoveGenerationContext(position, moveList);
  const attackInfo = generateAttackInfo(ctx);

  generateLegalMovesFromContext(ctx, attackInfo);

  return moveList.moves.slice(0, moveList.count);
};

export default generateLegalMoves;
