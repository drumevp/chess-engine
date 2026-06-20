import {
  BISHOP_INDEX,
  KING_INDEX,
  KNIGHT_INDEX,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../../engine/constants/piece";
import { COLOR } from "../../engine/constants/color";
import type { ColorType } from "../../engine/types/color";
import { NNUE_FULL_THREATS_FEATURE_DIMENSIONS } from "./nnue";

export const NNUE_FULL_THREAT_FEATURE_PIECE_COUNT = 12;

export const NNUE_FULL_THREAT_ALL_FEATURE_PIECES = new Int8Array([
  ROOK_INDEX,
  KNIGHT_INDEX,
  BISHOP_INDEX,
  QUEEN_INDEX,
  KING_INDEX,
  PAWN_INDEX,
  ROOK_INDEX + 6,
  KNIGHT_INDEX + 6,
  BISHOP_INDEX + 6,
  QUEEN_INDEX + 6,
  KING_INDEX + 6,
  PAWN_INDEX + 6,
]);

export const NNUE_FULL_THREAT_NUM_VALID_TARGETS = new Int8Array([
  8, 10, 8, 10, 0, 6,
  8, 10, 8, 10, 0, 6,
]);

export const NNUE_FULL_THREAT_TARGET_MAP = new Int8Array([
  3, 1, 2, -1, -1, 0,
  3, 1, 2, 4, -1, 0,
  3, 1, 2, -1, -1, 0,
  3, 1, 2, 4, -1, 0,
  -1, -1, -1, -1, -1, -1,
  2, 1, -1, -1, -1, 0,
]);

export const NNUE_FULL_THREAT_ORIENT_TABLE = new Int8Array([
  0, 0, 0, 0, 7, 7, 7, 7,
  0, 0, 0, 0, 7, 7, 7, 7,
  0, 0, 0, 0, 7, 7, 7, 7,
  0, 0, 0, 0, 7, 7, 7, 7,
  0, 0, 0, 0, 7, 7, 7, 7,
  0, 0, 0, 0, 7, 7, 7, 7,
  0, 0, 0, 0, 7, 7, 7, 7,
  0, 0, 0, 0, 7, 7, 7, 7,
]);

export const NNUE_FULL_THREAT_SENTINEL =
  NNUE_FULL_THREATS_FEATURE_DIMENSIONS;

export const getNnueFullThreatFeaturePieceType = (
  featurePiece: number,
): number => featurePiece % 6;

export const getNnueFullThreatFeaturePieceColor = (
  featurePiece: number,
): ColorType => (featurePiece < 6 ? COLOR.WHITE : COLOR.BLACK);

export const getNnueFullThreatFeaturePiece = (
  color: ColorType,
  piece: number,
): number => color * 6 + piece;
