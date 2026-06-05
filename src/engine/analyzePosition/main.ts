import generateAttackInfo from "../moves/attackInfo/main";
import generateLegalMovesFromContext from "../moves/generateLegalMovesFromContext";
import generateMoveGenerationContext from "../moves/generateMoveGenerationContext";
import { createMoveList } from "../moves/moveList";
import {
  moveDecodeCapturedPiece,
  moveDecodeColor,
  moveDecodeFlag,
  moveDecodeFrom,
  moveDecodePiece,
  moveDecodePromotionPiece,
  moveDecodeTo,
} from "../packedMove/main";
import { Move, Position } from "../types/main";
import { AnalyzePosition } from "./types";

const analyzePosition = (position: Position): AnalyzePosition => {
  const moveList = createMoveList();
  const ctx = generateMoveGenerationContext(position, moveList);
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
