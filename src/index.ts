export { default as ChessEngine } from "./engine/main";

export { COLOR, MOVE_FLAG } from "./engine/types/main";
export type { Move, Position } from "./engine/types/main";
export type { AnalyzePosition } from "./engine/analyzePosition/types";

export {
  encodeMove,
  moveDecodeFrom,
  moveDecodeTo,
  moveDecodeColor,
  moveDecodePiece,
  moveDecodeFlag,
  moveDecodeCapturedPiece,
  moveDecodePromotionPiece,
} from "./engine/packedMove/main";
