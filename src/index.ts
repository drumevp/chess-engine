export { default as ChessEngine } from "./engine/ChessEngine";

export { COLOR } from "./engine/constants/color";
export { MOVE_FLAG } from "./engine/constants/move";

export type { MoveFlagType } from "./engine/types/move";
export type { ColorType } from "./engine/types/color";
export type { Move } from "./engine/types/move";
export type { AnalyzePosition } from "./engine/types/analyzePosition";
export type { Position } from "./engine/types/position";

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
