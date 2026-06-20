import { GAME_STATE } from "../../../constants/gameState";
import packedMoveToUci from "../../../notation/uci/packedMoveToUci";
import analyzePosition from "../../analyzePosition/analyzePosition";
import type { Position } from "../../../types/position";
import type {
  FindBestMoveOptions,
  FindBestMoveResult,
} from "../../../types/findBestMove";
import iterativeDeepeningSearch from "../../../../search/iterativeDeepeningSearch";
import lazySmpSearch from "../../../../search/lazySmpSearch";
import { createNnueEvaluator } from "../../../../search/nnue/inference";
import getCachedNnueModel from "./nnueModelCache";
import normalizeFindBestMoveOptions from "./normalizeFindBestMoveOptions";
import {
  moveDecodeCapturedPiece,
  moveDecodeColor,
  moveDecodeFlag,
  moveDecodeFrom,
  moveDecodePiece,
  moveDecodePromotionPiece,
  moveDecodeTo,
} from "../packedMove";
import { Move } from "../../../types/move";

const findBestMove = async (
  position: Position,
  repetitionCounts: Map<bigint, number>,
  options: FindBestMoveOptions = {},
): Promise<FindBestMoveResult> => {
  const normalizedOptions = normalizeFindBestMoveOptions(options);
  const { depth, moveTimeMs, nodes, threads, evaluator, nnueModelPath } =
    normalizedOptions;
  const limits = {
    maxTimeMs: moveTimeMs,
    maxNodes: nodes,
  };
  const result =
    threads === 1
      ? iterativeDeepeningSearch(
          position,
          repetitionCounts,
          depth,
          limits,
          evaluator === "nnue"
            ? createNnueEvaluator(getCachedNnueModel(nnueModelPath))
            : undefined,
        )
      : await lazySmpSearch(position, repetitionCounts, depth, limits, {
          workerCount: threads,
          depthStagger: 0,
          evaluatorType: evaluator === "nnue" ? "defaultNnue" : "simple",
          nnueModelPath,
        });
  let move = result.bestMove;

  if (move === null) {
    const positionAnalysis = analyzePosition(position, repetitionCounts);

    if (
      positionAnalysis.gameState === GAME_STATE.ONGOING &&
      positionAnalysis.encodedLegalMoves.length > 0
    ) {
      move = positionAnalysis.encodedLegalMoves[0];
    }
  }

  let moveDecoded: Move | null = null;

  if (move) {
    moveDecoded = {
      from: moveDecodeFrom(move),
      to: moveDecodeTo(move),
      capturedPiece: moveDecodeCapturedPiece(move),
      color: moveDecodeColor(move),
      flag: moveDecodeFlag(move),
      piece: moveDecodePiece(move),
      promotionPiece: moveDecodePromotionPiece(move),
    };
  }

  return {
    move,
    moveDecoded,
    uci: move === null ? null : packedMoveToUci(move),
    score: result.score,
    pv: result.pv,
    pvUci: result.pv.map(packedMoveToUci),
    depth: result.depth,
    nodes: result.nodes,
    elapsedTimeMs: result.elapsedTimeMs,
    stopped: result.stopped,
    threads,
  };
};

export default findBestMove;
