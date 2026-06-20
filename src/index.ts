export { default as ChessEngine } from "./engine/ChessEngine";
export { UciClient } from "./uci/UciClient";

export { COLOR } from "./engine/constants/color";
export { MOVE_FLAG } from "./engine/constants/move";
export {
  ROOK_INDEX,
  BISHOP_INDEX,
  QUEEN_INDEX,
  KING_INDEX,
  PAWN_INDEX,
  KNIGHT_INDEX,
} from "./engine/constants/piece";
export { calculatePieceIndex } from "./engine/helpers/calculatePieceIndex";
export { GAME_STATE, GAME_END_REASON } from "./engine/constants/gameState";
export {
  DEFAULT_UCI_MOVE_TIME_MS,
  DEFAULT_UCI_TIMEOUT_MS,
} from "./uci/UciClient";

export type { MoveFlagType, Move, SimpleMove } from "./engine/types/move";
export type { ColorType } from "./engine/types/color";
export type { AnalyzePosition } from "./engine/types/analyzePosition";
export type { Position } from "./engine/types/position";
export type { GameState, GameEndReason } from "./engine/types/gameState";
export type {
  ChessEngineEvaluator,
  FindBestMoveOptions,
  FindBestMoveResult,
} from "./engine/types/findBestMove";
export type {
  UciAnalysis,
  UciClientOptions,
  UciGoOptions,
  UciPosition,
  UciScore,
} from "./uci/UciClient";

export {
  encodeMove,
  moveDecodeFrom,
  moveDecodeTo,
  moveDecodeColor,
  moveDecodePiece,
  moveDecodeFlag,
  moveDecodeCapturedPiece,
  moveDecodePromotionPiece,
} from "./engine/position/moves/packedMove";
