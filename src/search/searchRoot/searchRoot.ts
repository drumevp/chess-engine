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
import { orderMoves } from "../helpers/moveOrdering";
import quiescenceSearch from "./quiescenceSearch";
import { SearchResult } from "../types/search";
import { SearchControl } from "../types/search";

const searchRoot = (
  position: Position,
  repetitionCounts: Map<bigint, number>,
  alpha: number,
  beta: number,
  depth: number,
  control: SearchControl = createSearchControl(),
  priorityMove: number | null = null,
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

  if (depth <= 0) {
    const score = quiescenceSearch(
      searchPosition,
      alpha,
      beta,
      0,
      scratch,
      searchRepetitionCounts,
      control,
    );

    return {
      bestMove: null,
      score,
      pv: [],
    };
  }

  let bestMove: number | null = null;
  let bestScore = -Infinity;

  orderMoves(moveList, movesCount, priorityMove);

  for (let i = 0; i < movesCount; i++) {
    const move = moveList.moves[i];
    const undo = scratch.undoStack[0];

    makeMoveWithUndo(searchPosition, move, undo, { updateZobristHash: true });
    incrementRepetition(searchRepetitionCounts, searchPosition.zobristHash);
    const childHash = searchPosition.zobristHash;

    const score = -failSoftAlphaBetaNegaMax(
      searchPosition,
      -beta,
      -alpha,
      depth - 1,
      1,
      scratch,
      searchRepetitionCounts,
      control,
    );

    undoMove(searchPosition, move, undo);
    decrementRepetition(searchRepetitionCounts, childHash);

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
