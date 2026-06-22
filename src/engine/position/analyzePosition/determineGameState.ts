import {
  GAME_END_REASON,
  GAME_STATE,
  HALFMOVE_CLOCK_COUNT_LEADING_TO_DRAW,
  REPETITION_COUNT_LEADING_TO_DRAW,
} from "../../constants/gameState";
import { DetermineGameStateRValue } from "../../types/gameState";
import { Position } from "../../types/position";
import isInsufficientMaterial from "./isInsufficientMaterial";

export const determineDrawGameState = (
  position: Position,
  repetitionCounts: Map<bigint, number>,
  out: DetermineGameStateRValue,
): void => {
  const repetitionHashValue = repetitionCounts.get(position.zobristHash) || 0;

  if (repetitionHashValue >= REPETITION_COUNT_LEADING_TO_DRAW) {
    out.gameState = GAME_STATE.DRAW;
    out.gameEndReason = GAME_END_REASON.REPETITION;

    return;
  }

  if (position.halfMoveClock >= HALFMOVE_CLOCK_COUNT_LEADING_TO_DRAW) {
    out.gameState = GAME_STATE.DRAW;
    out.gameEndReason = GAME_END_REASON.HALFMOVE_CLOCK;

    return;
  }

  if (isInsufficientMaterial(position)) {
    out.gameState = GAME_STATE.DRAW;
    out.gameEndReason = GAME_END_REASON.INSUFFICIENT_MATERIAL;

    return;
  }

  out.gameState = GAME_STATE.ONGOING;
  out.gameEndReason = null;
};

const determineGameState = (
  position: Position,
  repetitionCounts: Map<bigint, number>,
  legalMovesCount: number,
  isCheck: boolean,
  out: DetermineGameStateRValue,
): void => {
  /**
   * Checkmate case
   */
  const isCheckmate = legalMovesCount === 0 && isCheck;

  if (isCheckmate) {
    out.gameState = GAME_STATE.CHECKMATE;
    out.gameEndReason = GAME_END_REASON.CHECKMATE;

    return;
  }

  /**
   * Stalemate case
   */
  const isStalemate = legalMovesCount === 0 && !isCheck;

  if (isStalemate) {
    out.gameState = GAME_STATE.STALEMATE;
    out.gameEndReason = GAME_END_REASON.STALEMATE;

    return;
  }

  determineDrawGameState(position, repetitionCounts, out);
};

export default determineGameState;
