import { History } from "../../../types/history";
import { Position } from "../../../types/position";
import { moveDecodeFrom, moveDecodePromotionPiece, moveDecodeTo } from "../packedMove";
import makeMove from "./makeMove";

const makeMoveWrapper = (position: Position, legalMoves: Uint32Array, from: number, to: number, promotionPiece?: number): History => {
  let foundMove: number | null = null;

  for(let i = 0; i < legalMoves.length; i++) {
    const encodedMove = legalMoves[i];
    const decodedFrom = moveDecodeFrom(encodedMove);

    if (from !== decodedFrom) {
      continue;
    }

    const decodedTo = moveDecodeTo(encodedMove);

    if (to !== decodedTo) {
      continue;
    }

    if(promotionPiece !== undefined) {
      const decodedPromotionPiece = moveDecodePromotionPiece(encodedMove);

      if (promotionPiece !== decodedPromotionPiece) {
        continue;
      }
    }

    foundMove = encodedMove;
    
    break;
  }

  if (foundMove === null) {
    throw new Error('Invalid makeMove');
  }

  const undo = makeMove(position, foundMove);

  return {
    move: foundMove,
    undo,
  };
}

export default makeMoveWrapper;