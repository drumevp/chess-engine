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
  createSearchScratch,
  createSearchState,
  getTerminalScore,
} from "../helpers/search";
import quiescenceSearch from "./quiescenceSearch";
import { SearchResult } from "../types/search";

const searchRoot = (
  position: Position,
  repetitionCounts: Map<bigint, number>,
  alpha: number,
  beta: number,
  depth: number,
): SearchResult => {
  const scratch = createSearchScratch(depth);
  const searchState = createSearchState(position, repetitionCounts);
  const searchPosition = searchState.position;
  const searchRepetitionCounts = searchState.repetitionCounts;

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
    };
  }

  if (depth <= 0) {
    return {
      bestMove: null,
      score: quiescenceSearch(
        searchPosition,
        alpha,
        beta,
        0,
        scratch.moveLists,
        scratch.contexts,
        scratch.attackInfos,
        scratch.undoStack,
        scratch.gameStateScratch,
        searchRepetitionCounts,
      ),
    };
  }

  let bestMove: number | null = null;
  let bestScore = -Infinity;

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
      scratch.moveLists,
      scratch.contexts,
      scratch.attackInfos,
      scratch.undoStack,
      scratch.gameStateScratch,
      searchRepetitionCounts,
    );

    undoMove(searchPosition, move, undo);
    decrementRepetition(searchRepetitionCounts, childHash);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }

    if (score > alpha) {
      alpha = score;
    }

    if (score >= beta) {
      return {
        bestMove,
        score,
      };
    }
  }

  return {
    bestMove,
    score: bestScore,
  };
};

export default searchRoot;
