import generateAttackInfo from "../../movegen/attackInfo/main";
import generateLegalMovesFromContext from "../../movegen/generateLegalMovesFromContext";
import getMoveGenerationContext from "../../movegen/getMoveGenerationContext";
import { createMoveList } from "../../movegen/moveList";
import { AnalyzePosition } from "../../types/analyzePosition";
import { Move } from "../../types/move";
import { Position } from "../../types/position";
import { moveDecodeCapturedPiece, moveDecodeColor, moveDecodeFlag, moveDecodeFrom, moveDecodePiece, moveDecodePromotionPiece, moveDecodeTo } from "../moves/packedMove";


const analyzePosition = (position: Position): AnalyzePosition => {
  const moveList = createMoveList();
  const ctx = getMoveGenerationContext(position, moveList);
  const attackInfo = generateAttackInfo(ctx);

  const legalMovesCount = generateLegalMovesFromContext(ctx, attackInfo);

  const legalMoves: Move[] = [];

  for (let i = 0; i < moveList.count; i++) {
    const move = moveList.moves[i];

    legalMoves.push({
      encodedMove: move,
      from: moveDecodeFrom(move),
      to: moveDecodeTo(move),
      color: moveDecodeColor(move),
      flag: moveDecodeFlag(move),
      piece: moveDecodePiece(move),
      capturedPiece: moveDecodeCapturedPiece(move),
      promotionPiece: moveDecodePromotionPiece(move),
    });
  }

  const isCheck = attackInfo.checkCount > 0;
  const isCheckmate = legalMovesCount === 0 && isCheck;
  const isStalemate = legalMovesCount === 0 && !isCheck;

  return {
    legalMoves,
    legalMovesCount,
    sideToMove: position.color,
    isCheck,
    isCheckmate,
    isStalemate,
  };
};

export default analyzePosition;
