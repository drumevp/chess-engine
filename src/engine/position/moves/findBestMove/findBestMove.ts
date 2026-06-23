import { GAME_STATE } from "../../../constants/gameState";
import packedMoveToUci from "../../../notation/uci/packedMoveToUci";
import analyzePosition from "../../analyzePosition/analyzePosition";
import type { Position } from "../../../types/position";
import type {
  FindBestMoveOptions,
  FindBestMoveResult,
} from "../../../types/findBestMove";
import iterativeDeepeningSearch from "../../../../search/iterativeDeepeningSearch";
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
  const normalizedOptions = await normalizeFindBestMoveOptions(options);
  const { depth, moveTimeMs, nodes, threads, evaluator, nnueModelPath, nnueModelUrl } =
    normalizedOptions;
  const limits = {
    maxTimeMs: moveTimeMs,
    maxNodes: nodes,
  };

  let result: { bestMove: number | null; score: number; pv: number[]; depth: number; selDepth: number; nodes: number; qNodes: number; qDeltaPrunes: number; betaCutoffs: number; firstMoveBetaCutoffs: number; betaCutoffMoveIndexSum: number; nullMoveCutoffs: number; reverseFutilityPrunes: number; probCutCutoffs: number; singularExtensions: number; hashfull: number; elapsedTimeMs: number; stopped: boolean };

  if (threads === 1) {
    result = iterativeDeepeningSearch(
      position,
      repetitionCounts,
      depth,
      limits,
      evaluator === "nnue"
        ? createNnueEvaluator(await getCachedNnueModel(nnueModelPath, nnueModelUrl))
        : undefined,
    );
  } else if (typeof __BROWSER__ === "undefined" || !__BROWSER__) {
    const { default: lazySmpSearch } = await import("../../../../search/lazySmpSearch");
    result = await lazySmpSearch(position, repetitionCounts, depth, limits, {
      workerCount: threads,
      depthStagger: 0,
      evaluatorType: evaluator === "nnue" ? "defaultNnue" : "simple",
      nnueModelPath,
    });
  } else {
    throw new Error("Multi-threaded search requires Node.js");
  }

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
    selDepth: result.selDepth,
    nodes: result.nodes,
    qNodes: result.qNodes,
    qDeltaPrunes: result.qDeltaPrunes,
    betaCutoffs: result.betaCutoffs,
    firstMoveBetaCutoffs: result.firstMoveBetaCutoffs,
    betaCutoffMoveIndexSum: result.betaCutoffMoveIndexSum,
    nullMoveCutoffs: result.nullMoveCutoffs,
    reverseFutilityPrunes: result.reverseFutilityPrunes,
    probCutCutoffs: result.probCutCutoffs,
    singularExtensions: result.singularExtensions,
    hashfull: result.hashfull,
    elapsedTimeMs: result.elapsedTimeMs,
    stopped: result.stopped,
    threads,
  };
};

export default findBestMove;
