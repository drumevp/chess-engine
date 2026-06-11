export { default as ChessEngine } from "./engine/ChessEngine";

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

export type { MoveFlagType } from "./engine/types/move";
export type { ColorType } from "./engine/types/color";
export type { Move } from "./engine/types/move";
export type { AnalyzePosition } from "./engine/types/analyzePosition";
export type { Position } from "./engine/types/position";
export type { GameState, GameEndReason } from "./engine/types/gameState";

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
