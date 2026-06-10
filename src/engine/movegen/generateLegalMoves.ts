import { Position } from "../types/position";
import generateAttackInfo from "./attackInfo/main";
import generateLegalMovesFromContext from "./generateLegalMovesFromContext";
import getMoveGenerationContext from "./getMoveGenerationContext";
import { createMoveList } from "./moveList";

const generateLegalMoves = (position: Position): Uint32Array => {
  const moveList = createMoveList();
  const ctx = getMoveGenerationContext(position, moveList);
  const attackInfo = generateAttackInfo(ctx);

  generateLegalMovesFromContext(ctx, attackInfo);

  return moveList.moves.slice(0, moveList.count);
};

export default generateLegalMoves;
