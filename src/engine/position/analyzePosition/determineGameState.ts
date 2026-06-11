import {
  GAME_END_REASON,
  GAME_STATE,
  HALFMOVE_CLOCK_COUNT_LEADING_TO_DRAW,
  REPETITION_COUNT_LEADING_TO_DRAW,
} from "../../constants/gameState";
import { GameEndReason, GameState } from "../../types/gameState";
import { Position } from "../../types/position";
import isInsufficientMaterial from "./isInsufficientMaterial";

type DetermineGameStateRValue = {
  gameState: GameState;
  gameEndReason: GameEndReason | null;
};

const determineGameState = (
  position: Position,
  repetitionCounts: Map<bigint, number>,
  legalMovesCount: number,
  isCheck: boolean,
): DetermineGameStateRValue => {
  /**
   * Checkmate case
   */
  const isCheckmate = legalMovesCount === 0 && isCheck;

  if (isCheckmate) {
    return {
      gameState: GAME_STATE.CHECKMATE,
      gameEndReason: GAME_END_REASON.CHECKMATE,
    };
  }

  /**
   * Stalemate case
   */
  const isStalemate = legalMovesCount === 0 && !isCheck;

  if (isStalemate) {
    return {
      gameState: GAME_STATE.STALEMATE,
      gameEndReason: GAME_END_REASON.STALEMATE,
    };
  }

  /**
   * Repetition case
   */
  const repetitionHashValue = repetitionCounts.get(position.zobristHash) || 0;

  if (repetitionHashValue >= REPETITION_COUNT_LEADING_TO_DRAW) {
    return {
      gameState: GAME_STATE.DRAW,
      gameEndReason: GAME_END_REASON.REPETITION,
    };
  }

  /**
   * Halfmove clock case
   */
  if (position.halfMoveClock >= HALFMOVE_CLOCK_COUNT_LEADING_TO_DRAW) {
    return {
      gameState: GAME_STATE.DRAW,
      gameEndReason: GAME_END_REASON.HALFMOVE_CLOCK,
    };
  }

  /**
   * Insufficient material case
   */
  if (isInsufficientMaterial(position)) {
    return {
      gameState: GAME_STATE.DRAW,
      gameEndReason: GAME_END_REASON.INSUFFICIENT_MATERIAL,
    };
  }

  return {
    gameState: GAME_STATE.ONGOING,
    gameEndReason: null,
  };
};

export default determineGameState;
