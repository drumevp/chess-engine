import { History } from "../../../types/history";
import { SimpleMove } from "../../../types/move";
import { Position } from "../../../types/position";
import { moveDecodeFrom, moveDecodePromotionPiece, moveDecodeTo } from "../packedMove";
import makeMove from "./makeMove";

const makeMoveWrapper = (position: Position, legalMoves: Uint32Array, move: SimpleMove): History => {
  let foundMove: number | null = null;

  for(let i = 0; i < legalMoves.length; i++) {
    const encodedMove = legalMoves[i];
    const decodedFrom = moveDecodeFrom(encodedMove);

    if (move.from !== decodedFrom) {
      continue;
    }

    const decodedTo = moveDecodeTo(encodedMove);

    if (move.to !== decodedTo) {
      continue;
    }

    if(move.promotionPiece !== undefined) {
      const decodedPromotionPiece = moveDecodePromotionPiece(encodedMove);

      if (move.promotionPiece !== decodedPromotionPiece) {
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