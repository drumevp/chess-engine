import { COLOR } from "../../engine/constants/color";
import {
  BISHOP_INDEX,
  KING_INDEX,
  KNIGHT_INDEX,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../../engine/constants/piece";
import calculatePieceIndex from "../../engine/helpers/calculatePieceIndex";
import type { Position } from "../../engine/types/position";
import { CHECKMATE_SCORE } from "../constants/eval";
import {
  CORRECTION_HISTORY_COLOR_COUNT,
  CORRECTION_HISTORY_MATE_SCORE_BUFFER,
  CORRECTION_HISTORY_MAX_CORRECTION,
  CORRECTION_HISTORY_MAX_UPDATE_WEIGHT,
  CORRECTION_HISTORY_SCALE,
  CORRECTION_HISTORY_TABLE_MASK,
  CORRECTION_HISTORY_TABLE_SIZE,
  CORRECTION_HISTORY_WEIGHT_SCALE,
} from "../constants/correctionHistory";
import type { CorrectionHistory } from "../types/correctionHistory";

const SCORE_TABLE_SIZE =
  CORRECTION_HISTORY_COLOR_COUNT * CORRECTION_HISTORY_TABLE_SIZE;
const MAX_SCALED_CORRECTION =
  CORRECTION_HISTORY_MAX_CORRECTION * CORRECTION_HISTORY_SCALE;
const CORRECTION_TABLE_COUNT = 4;

const mixNumber = (hash: number, value: number): number => {
  hash ^= value + 0x9e3779b9 + ((hash << 6) >>> 0) + (hash >>> 2);
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  hash ^= hash >>> 13;

  return hash >>> 0;
};

const mixBitboard = (
  hash: number,
  position: Position,
  stateIndex: number,
): number => {
  hash = mixNumber(hash, position.stateLo[stateIndex]);
  hash = mixNumber(hash, position.stateHi[stateIndex]);

  return hash;
};

const getCorrectionHistoryIndex = (
  position: Position,
  hash: number,
): number =>
  position.color * CORRECTION_HISTORY_TABLE_SIZE +
  (hash & CORRECTION_HISTORY_TABLE_MASK);

const getPawnCorrectionHistoryIndex = (position: Position): number => {
  let hash = 0x243f6a88;

  hash = mixBitboard(
    hash,
    position,
    calculatePieceIndex(COLOR.WHITE, PAWN_INDEX),
  );
  hash = mixBitboard(
    hash,
    position,
    calculatePieceIndex(COLOR.BLACK, PAWN_INDEX),
  );

  return getCorrectionHistoryIndex(position, hash);
};

const getMinorPieceCorrectionHistoryIndex = (position: Position): number => {
  let hash = 0x85a308d3;

  hash = mixBitboard(
    hash,
    position,
    calculatePieceIndex(COLOR.WHITE, KNIGHT_INDEX),
  );
  hash = mixBitboard(
    hash,
    position,
    calculatePieceIndex(COLOR.WHITE, BISHOP_INDEX),
  );
  hash = mixBitboard(
    hash,
    position,
    calculatePieceIndex(COLOR.BLACK, KNIGHT_INDEX),
  );
  hash = mixBitboard(
    hash,
    position,
    calculatePieceIndex(COLOR.BLACK, BISHOP_INDEX),
  );

  return getCorrectionHistoryIndex(position, hash);
};

const getMajorPieceCorrectionHistoryIndex = (position: Position): number => {
  let hash = 0x13198a2e;

  hash = mixBitboard(
    hash,
    position,
    calculatePieceIndex(COLOR.WHITE, ROOK_INDEX),
  );
  hash = mixBitboard(
    hash,
    position,
    calculatePieceIndex(COLOR.WHITE, QUEEN_INDEX),
  );
  hash = mixBitboard(
    hash,
    position,
    calculatePieceIndex(COLOR.BLACK, ROOK_INDEX),
  );
  hash = mixBitboard(
    hash,
    position,
    calculatePieceIndex(COLOR.BLACK, QUEEN_INDEX),
  );

  return getCorrectionHistoryIndex(position, hash);
};

const getNonPawnCorrectionHistoryIndex = (position: Position): number => {
  let hash = 0x03707344;

  for (let color = COLOR.WHITE; color <= COLOR.BLACK; color++) {
    hash = mixBitboard(hash, position, calculatePieceIndex(color, ROOK_INDEX));
    hash = mixBitboard(hash, position, calculatePieceIndex(color, KNIGHT_INDEX));
    hash = mixBitboard(hash, position, calculatePieceIndex(color, BISHOP_INDEX));
    hash = mixBitboard(hash, position, calculatePieceIndex(color, QUEEN_INDEX));
    hash = mixBitboard(hash, position, calculatePieceIndex(color, KING_INDEX));
  }

  return getCorrectionHistoryIndex(position, hash);
};

const clamp = (value: number, min: number, max: number): number => {
  if (value <= min) {
    return min;
  }

  if (value >= max) {
    return max;
  }

  return value;
};

const updateCorrectionScore = (
  scores: Int32Array,
  index: number,
  target: number,
  weight: number,
): void => {
  const current = scores[index];

  scores[index] =
    current +
    Math.trunc(
      ((target - current) * weight) / CORRECTION_HISTORY_WEIGHT_SCALE,
    );
};

const getCorrectionHistoryUpdateWeight = (depth: number): number =>
  depth >= CORRECTION_HISTORY_MAX_UPDATE_WEIGHT
    ? CORRECTION_HISTORY_MAX_UPDATE_WEIGHT
    : depth;

const isMateScore = (score: number): boolean =>
  Math.abs(score) >= CHECKMATE_SCORE - CORRECTION_HISTORY_MATE_SCORE_BUFFER;

export const createCorrectionHistory = (): CorrectionHistory => ({
  pawnScores: new Int32Array(SCORE_TABLE_SIZE),
  minorPieceScores: new Int32Array(SCORE_TABLE_SIZE),
  majorPieceScores: new Int32Array(SCORE_TABLE_SIZE),
  nonPawnScores: new Int32Array(SCORE_TABLE_SIZE),
});

export const getCorrectedStaticEval = (
  position: Position,
  correctionHistory: CorrectionHistory,
  staticEval: number,
): number => {
  const correction =
    correctionHistory.pawnScores[getPawnCorrectionHistoryIndex(position)] +
    correctionHistory.minorPieceScores[
      getMinorPieceCorrectionHistoryIndex(position)
    ] +
    correctionHistory.majorPieceScores[
      getMajorPieceCorrectionHistoryIndex(position)
    ] +
    correctionHistory.nonPawnScores[getNonPawnCorrectionHistoryIndex(position)];
  const correctedStaticEval =
    staticEval +
    Math.trunc(
      correction / (CORRECTION_TABLE_COUNT * CORRECTION_HISTORY_SCALE),
    );

  return clamp(
    correctedStaticEval,
    -CHECKMATE_SCORE + CORRECTION_HISTORY_MATE_SCORE_BUFFER,
    CHECKMATE_SCORE - CORRECTION_HISTORY_MATE_SCORE_BUFFER,
  );
};

export const recordCorrectionHistory = (
  correctionHistory: CorrectionHistory,
  position: Position,
  depth: number,
  rawStaticEval: number,
  correctedStaticEval: number,
  score: number,
  originalAlpha: number,
  beta: number,
  isCheck: boolean,
): void => {
  if (
    isCheck ||
    depth <= 0 ||
    !Number.isFinite(score) ||
    isMateScore(score) ||
    isMateScore(rawStaticEval)
  ) {
    return;
  }

  if (score >= beta && score <= correctedStaticEval) {
    return;
  }

  if (score <= originalAlpha && score >= correctedStaticEval) {
    return;
  }

  const target = clamp(
    (score - rawStaticEval) * CORRECTION_HISTORY_SCALE,
    -MAX_SCALED_CORRECTION,
    MAX_SCALED_CORRECTION,
  );
  const weight = getCorrectionHistoryUpdateWeight(depth);
  const pawnIndex = getPawnCorrectionHistoryIndex(position);
  const minorPieceIndex = getMinorPieceCorrectionHistoryIndex(position);
  const majorPieceIndex = getMajorPieceCorrectionHistoryIndex(position);
  const nonPawnIndex = getNonPawnCorrectionHistoryIndex(position);

  updateCorrectionScore(correctionHistory.pawnScores, pawnIndex, target, weight);
  updateCorrectionScore(
    correctionHistory.minorPieceScores,
    minorPieceIndex,
    target,
    weight,
  );
  updateCorrectionScore(
    correctionHistory.majorPieceScores,
    majorPieceIndex,
    target,
    weight,
  );
  updateCorrectionScore(
    correctionHistory.nonPawnScores,
    nonPawnIndex,
    target,
    weight,
  );
};
