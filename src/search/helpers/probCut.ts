import {
  decrementRepetition,
  incrementRepetition,
} from "../../engine/helpers/zobristHashRepetition";
import { MOVE_FLAG } from "../../engine/constants/move";
import { makeMoveWithUndo } from "../../engine/position/moves/makeMove/makeMove";
import { moveDecodeFlag } from "../../engine/position/moves/packedMove";
import undoMove from "../../engine/position/moves/undoMove/undoMove";
import type { MoveList } from "../../engine/types/move";
import type { Position } from "../../engine/types/position";
import { CHECKMATE_SCORE } from "../constants/eval";
import {
  PROB_CUT_MARGIN,
  PROB_CUT_MATE_SCORE_BUFFER,
  PROB_CUT_MIN_DEPTH,
  PROB_CUT_REDUCTION,
  PROB_CUT_SEE_THRESHOLD,
} from "../constants/probCut";
import {
  popEvaluatorMove,
  pushEvaluatorMove,
} from "../eval/evaluator";
import quiescenceSearch from "../searchRoot/quiescenceSearch";
import type { CaptureHistory } from "../types/captureHistory";
import type { HistoryHeuristic } from "../types/historyHeuristic";
import type { SearchControl, SearchScratch } from "../types/search";
import type { TranspositionTable } from "../types/transpositionTable";

type ProbCutSearch = (
  position: Position,
  alpha: number,
  beta: number,
  depth: number,
  ply: number,
  scratch: SearchScratch,
  repetitionCounts: Map<bigint, number>,
  control: SearchControl,
  transpositionTable: TranspositionTable,
  historyHeuristic: HistoryHeuristic,
  captureHistory: CaptureHistory,
) => number;

const isProbCutMoveCandidate = (move: number): boolean => {
  const moveFlag = moveDecodeFlag(move);

  return (
    moveFlag === MOVE_FLAG.CAPTURE ||
    moveFlag === MOVE_FLAG.PROMOTION_CAPTURE ||
    moveFlag === MOVE_FLAG.EN_PASSANT ||
    moveFlag === MOVE_FLAG.PROMOTION
  );
};

export const canUseProbCut = (
  depth: number,
  beta: number,
  isCheck: boolean,
): boolean => {
  if (isCheck || depth < PROB_CUT_MIN_DEPTH || !Number.isFinite(beta)) {
    return false;
  }

  return Math.abs(beta) < CHECKMATE_SCORE - PROB_CUT_MATE_SCORE_BUFFER;
};

export const getProbCutBeta = (beta: number): number =>
  beta + PROB_CUT_MARGIN;

export const getProbCutSearchDepth = (depth: number): number =>
  Math.max(0, depth - PROB_CUT_REDUCTION - 1);

export const tryProbCut = (
  search: ProbCutSearch,
  position: Position,
  moveList: MoveList,
  movesCount: number,
  probCutBeta: number,
  probCutDepth: number,
  ply: number,
  scratch: SearchScratch,
  repetitionCounts: Map<bigint, number>,
  control: SearchControl,
  transpositionTable: TranspositionTable,
  historyHeuristic: HistoryHeuristic,
  captureHistory: CaptureHistory,
): number | null => {
  const moveOrderingScratch = scratch.moveOrderingScratches[ply];

  for (let i = 0; i < movesCount; i++) {
    const move = moveList.moves[i];

    if (
      !isProbCutMoveCandidate(move) ||
      moveOrderingScratch.staticExchangeScores[i] < PROB_CUT_SEE_THRESHOLD
    ) {
      continue;
    }

    const undo = scratch.undoStack[ply];

    makeMoveWithUndo(position, move, undo, { updateZobristHash: true });
    pushEvaluatorMove(control.evaluator, position, move, undo);
    incrementRepetition(repetitionCounts, position.zobristHash);
    const childHash = position.zobristHash;

    let score = -quiescenceSearch(
      position,
      -probCutBeta,
      -probCutBeta + 1,
      ply + 1,
      scratch,
      repetitionCounts,
      control,
      captureHistory,
    );

    if (!control.stopped && score >= probCutBeta) {
      score = -search(
        position,
        -probCutBeta,
        -probCutBeta + 1,
        probCutDepth,
        ply + 1,
        scratch,
        repetitionCounts,
        control,
        transpositionTable,
        historyHeuristic,
        captureHistory,
      );
    }

    undoMove(position, move, undo);
    decrementRepetition(repetitionCounts, childHash);
    popEvaluatorMove(control.evaluator);

    if (control.stopped || score >= probCutBeta) {
      return score;
    }
  }

  return null;
};
