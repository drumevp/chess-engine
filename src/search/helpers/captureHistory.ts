import { MOVE_FLAG } from "../../engine/constants/move";
import { PAWN_INDEX } from "../../engine/constants/piece";
import {
  moveDecodeCapturedPiece,
  moveDecodeColor,
  moveDecodeFlag,
  moveDecodePiece,
  moveDecodeTo,
} from "../../engine/position/moves/packedMove";
import {
  CAPTURE_HISTORY_COLOR_COUNT,
  CAPTURE_HISTORY_MAX_SCORE,
  CAPTURE_HISTORY_PIECE_COUNT,
  CAPTURE_HISTORY_SQUARE_COUNT,
} from "../constants/captureHistory";
import type { CaptureHistory } from "../types/captureHistory";

const CAPTURE_HISTORY_TO_OFFSET = CAPTURE_HISTORY_PIECE_COUNT;
const CAPTURE_HISTORY_PIECE_OFFSET =
  CAPTURE_HISTORY_SQUARE_COUNT * CAPTURE_HISTORY_TO_OFFSET;
const CAPTURE_HISTORY_COLOR_OFFSET =
  CAPTURE_HISTORY_PIECE_COUNT * CAPTURE_HISTORY_PIECE_OFFSET;

const getCaptureHistoryCapturedPiece = (move: number): number | null => {
  const moveFlag = moveDecodeFlag(move);

  if (moveFlag === MOVE_FLAG.EN_PASSANT) {
    return PAWN_INDEX;
  }

  if (
    moveFlag === MOVE_FLAG.CAPTURE ||
    moveFlag === MOVE_FLAG.PROMOTION_CAPTURE
  ) {
    return moveDecodeCapturedPiece(move);
  }

  return null;
};

const getCaptureHistoryIndex = (
  move: number,
  capturedPiece: number,
): number =>
  moveDecodeColor(move) * CAPTURE_HISTORY_COLOR_OFFSET +
  moveDecodePiece(move) * CAPTURE_HISTORY_PIECE_OFFSET +
  moveDecodeTo(move) * CAPTURE_HISTORY_TO_OFFSET +
  capturedPiece;

export const createCaptureHistory = (): CaptureHistory => ({
  scores: new Int32Array(
    CAPTURE_HISTORY_COLOR_COUNT * CAPTURE_HISTORY_COLOR_OFFSET,
  ),
});

export const getCaptureHistoryScore = (
  captureHistory: CaptureHistory,
  move: number,
): number => {
  const capturedPiece = getCaptureHistoryCapturedPiece(move);

  if (capturedPiece === null) {
    return 0;
  }

  return captureHistory.scores[getCaptureHistoryIndex(move, capturedPiece)];
};

export const recordCaptureHistory = (
  captureHistory: CaptureHistory,
  move: number,
  depth: number,
): void => {
  const capturedPiece = getCaptureHistoryCapturedPiece(move);

  if (capturedPiece === null) {
    return;
  }

  const index = getCaptureHistoryIndex(move, capturedPiece);
  const bonus = depth * depth;
  const score = captureHistory.scores[index] + bonus;

  captureHistory.scores[index] =
    score > CAPTURE_HISTORY_MAX_SCORE ? CAPTURE_HISTORY_MAX_SCORE : score;
};
