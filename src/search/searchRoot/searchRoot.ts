import {
  decrementRepetition,
  incrementRepetition,
} from "../../engine/helpers/zobristHashRepetition";
import generateAttackInfo from "../../engine/movegen/attackInfo/main";
import generateLegalMovesFromContext from "../../engine/movegen/generateLegalMovesFromContext";
import getMoveGenerationContext from "../../engine/movegen/getMoveGenerationContext";
import determineGameState from "../../engine/position/analyzePosition/determineGameState";
import { makeMoveWithUndo } from "../../engine/position/moves/makeMove/makeMove";
import undoMove from "../../engine/position/moves/undoMove/undoMove";
import { Position } from "../../engine/types/position";
import failSoftAlphaBetaNegaMax from "./failSoftAlphaBetaNegaMax";
import {
  popEvaluatorMove,
  pushEvaluatorMove,
  resetEvaluator,
} from "../eval/evaluator";
import {
  createCaptureHistory,
  recordCaptureHistory,
} from "../helpers/captureHistory";
import { createCorrectionHistory } from "../helpers/correctionHistory";
import {
  createSearchControl,
  createSearchScratch,
  createSearchState,
  getTerminalScore,
  shouldStopSearch,
} from "../helpers/search";
import {
  getPrincipalVariation,
  resetPrincipalVariation,
  updatePrincipalVariation,
} from "../helpers/principalVariation";
import {
  createHistoryHeuristic,
  recordHistoryHeuristic,
} from "../helpers/historyHeuristic";
import {
  getMateDistancePrunedAlpha,
  getMateDistancePrunedBeta,
  isMateDistancePruned,
} from "../helpers/mateDistancePruning";
import { orderMoves } from "../helpers/moveOrdering";
import quiescenceSearch from "./quiescenceSearch";
import { SearchResult } from "../types/search";
import { SearchControl } from "../types/search";
import type { CaptureHistory } from "../types/captureHistory";
import type { CorrectionHistory } from "../types/correctionHistory";
import type { HistoryHeuristic } from "../types/historyHeuristic";
import { TranspositionTable } from "../types/transpositionTable";
import {
  createTranspositionTable,
  getTranspositionTableBestMove,
} from "../transpositionTable/transpositionTable";

const searchRoot = (
  position: Position,
  repetitionCounts: Map<bigint, number>,
  alpha: number,
  beta: number,
  depth: number,
  control: SearchControl = createSearchControl(),
  priorityMove: number | null = null,
  transpositionTable?: TranspositionTable,
  historyHeuristic?: HistoryHeuristic,
  captureHistory?: CaptureHistory,
  correctionHistory?: CorrectionHistory,
): SearchResult => {
  if (shouldStopSearch(control)) {
    return {
      bestMove: null,
      score: 0,
      pv: [],
    };
  }

  const scratch = createSearchScratch(depth);
  const searchState = createSearchState(position, repetitionCounts);
  const searchPosition = searchState.position;
  const searchRepetitionCounts = searchState.repetitionCounts;
  const searchCaptureHistory = captureHistory ?? createCaptureHistory();
  const searchCorrectionHistory =
    correctionHistory ?? createCorrectionHistory();
  resetEvaluator(control.evaluator, searchPosition);
  resetPrincipalVariation(scratch, 0);

  const moveList = scratch.moveLists[0];
  const ctx = getMoveGenerationContext(
    searchPosition,
    moveList,
    scratch.contexts[0],
  );
  const attackInfo = generateAttackInfo(ctx, scratch.attackInfos[0]);
  const movesCount = generateLegalMovesFromContext(ctx, attackInfo);

  const isCheck = attackInfo.checkCount > 0;

  determineGameState(
    searchPosition,
    searchRepetitionCounts,
    movesCount,
    isCheck,
    scratch.gameStateScratch,
  );

  const terminalScore = getTerminalScore(scratch.gameStateScratch, 0);

  if (terminalScore !== null) {
    return {
      bestMove: null,
      score: terminalScore,
      pv: [],
    };
  }

  alpha = getMateDistancePrunedAlpha(alpha, 0);
  beta = getMateDistancePrunedBeta(beta, 0);

  if (isMateDistancePruned(alpha, beta)) {
    return {
      bestMove: null,
      score: alpha,
      pv: [],
    };
  }

  if (depth <= 0) {
    const score = quiescenceSearch(
      searchPosition,
      alpha,
      beta,
      0,
      scratch,
      searchRepetitionCounts,
      control,
      searchCaptureHistory,
      searchCorrectionHistory,
    );

    return {
      bestMove: null,
      score,
      pv: [],
    };
  }

  let bestMove: number | null = null;
  let bestScore = -Infinity;
  const searchTranspositionTable =
    transpositionTable ?? createTranspositionTable();
  const searchHistoryHeuristic = historyHeuristic ?? createHistoryHeuristic();
  const transpositionTableBestMove = getTranspositionTableBestMove(
    searchTranspositionTable,
    searchPosition.zobristHash,
  );

  orderMoves(
    searchPosition,
    moveList,
    movesCount,
    scratch.moveOrderingScratches[0],
    priorityMove ?? transpositionTableBestMove,
    scratch.killerMoves,
    searchHistoryHeuristic,
    searchCaptureHistory,
    0,
  );

  bestMove = movesCount > 0 ? moveList.moves[0] : null;

  for (let i = 0; i < movesCount; i++) {
    const move = moveList.moves[i];
    const undo = scratch.undoStack[0];

    makeMoveWithUndo(searchPosition, move, undo, { updateZobristHash: true });
    pushEvaluatorMove(control.evaluator, searchPosition, move, undo);
    incrementRepetition(searchRepetitionCounts, searchPosition.zobristHash);
    const childHash = searchPosition.zobristHash;

    let score: number;

    if (i === 0) {
      score = -failSoftAlphaBetaNegaMax(
        searchPosition,
        -beta,
        -alpha,
        depth - 1,
        1,
        scratch,
        searchRepetitionCounts,
        control,
        searchTranspositionTable,
        searchHistoryHeuristic,
        searchCaptureHistory,
        searchCorrectionHistory,
      );
    } else {
      score = -failSoftAlphaBetaNegaMax(
        searchPosition,
        -alpha - 1,
        -alpha,
        depth - 1,
        1,
        scratch,
        searchRepetitionCounts,
        control,
        searchTranspositionTable,
        searchHistoryHeuristic,
        searchCaptureHistory,
        searchCorrectionHistory,
      );

      if (!control.stopped && score > alpha && score < beta) {
        score = -failSoftAlphaBetaNegaMax(
          searchPosition,
          -beta,
          -alpha,
          depth - 1,
          1,
          scratch,
          searchRepetitionCounts,
          control,
          searchTranspositionTable,
          searchHistoryHeuristic,
          searchCaptureHistory,
          searchCorrectionHistory,
        );
      }
    }

    undoMove(searchPosition, move, undo);
    decrementRepetition(searchRepetitionCounts, childHash);
    popEvaluatorMove(control.evaluator);

    if (control.stopped) {
      return {
        bestMove,
        score: bestScore === -Infinity ? 0 : bestScore,
        pv: getPrincipalVariation(scratch),
      };
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }

    if (score > alpha) {
      alpha = score;
      updatePrincipalVariation(scratch, 0, move);
    }

    if (score >= beta) {
      recordHistoryHeuristic(searchHistoryHeuristic, move, depth);
      recordCaptureHistory(searchCaptureHistory, move, depth);

      return {
        bestMove,
        score,
        pv: getPrincipalVariation(scratch),
      };
    }
  }

  return {
    bestMove,
    score: bestScore,
    pv: getPrincipalVariation(scratch),
  };
};

export default searchRoot;
