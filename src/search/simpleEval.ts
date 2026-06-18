/**
 * Placeholder eval fn
 */

import { COLOR } from "../engine/constants/color";
import getPieceTypeFromStateIndex from "../engine/helpers/getPieceTypeFromStateIndex";
import { Position } from "../engine/types/position";
import { PIECE_VALUE } from "./constants/eval";

const simpleEval = (position: Position): number => {
  let score = 0;

  for (let boardIndex = 0; boardIndex < position.pieceAt.length; boardIndex++) {
    const pieceIndex = position.pieceAt[boardIndex];

    if (pieceIndex === -1) {
      continue;
    }

    const absolutePieceIndex = getPieceTypeFromStateIndex(pieceIndex);
    
    if (pieceIndex > 5) {
      score -= PIECE_VALUE[absolutePieceIndex];
    } else {
      score += PIECE_VALUE[absolutePieceIndex];
    }
  }

  return position.color === COLOR.WHITE ? score : -score;
}

export default simpleEval;