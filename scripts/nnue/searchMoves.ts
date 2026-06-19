import generateFenToPosition from "../../src/engine/fen/fenToPosition/generateFenToPosition";
import internalToUci from "../../src/engine/notation/uci/internalToUci";
import {
  moveDecodeFrom,
  moveDecodePromotionPiece,
  moveDecodeTo,
} from "../../src/engine/position/moves/packedMove";
import iterativeDeepeningSearch from "../../src/search/iterativeDeepeningSearch";
import type { SearchEvaluator } from "../../src/search/types/nnue";

export const encodedMoveToUci = (move: number): string =>
  internalToUci({
    from: moveDecodeFrom(move),
    to: moveDecodeTo(move),
    promotionPiece: moveDecodePromotionPiece(move),
  });

export const chooseSearchMove = (
  fen: string,
  depth: number,
  moveTimeMs: number,
  evaluator?: SearchEvaluator,
): string | null => {
  const position = generateFenToPosition(fen);
  const repetitionCounts = new Map<bigint, number>([
    [position.zobristHash, 1],
  ]);
  const result = iterativeDeepeningSearch(
    position,
    repetitionCounts,
    depth,
    { maxTimeMs: moveTimeMs },
    evaluator,
  );

  return result.bestMove === null ? null : encodedMoveToUci(result.bestMove);
};
