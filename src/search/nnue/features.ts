import { COLOR } from "../../engine/constants/color";
import {
  BISHOP_INDEX,
  KING_INDEX,
  KNIGHT_INDEX,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../../engine/constants/piece";
import getPieceTypeFromStateIndex from "../../engine/helpers/getPieceTypeFromStateIndex";
import type { ColorType } from "../../engine/types/color";
import type { Position } from "../../engine/types/position";
import {
  NNUE_KING_BUCKETS,
  NNUE_ORIENT_TABLE,
  NNUE_PIECE_SQUARE_BUCKET_SIZE,
  NNUE_SQUARE_COUNT,
} from "../constants/nnue";

const WHITE_PAWN_OFFSET = 0 * NNUE_SQUARE_COUNT;
const BLACK_PAWN_OFFSET = 1 * NNUE_SQUARE_COUNT;
const WHITE_KNIGHT_OFFSET = 2 * NNUE_SQUARE_COUNT;
const BLACK_KNIGHT_OFFSET = 3 * NNUE_SQUARE_COUNT;
const WHITE_BISHOP_OFFSET = 4 * NNUE_SQUARE_COUNT;
const BLACK_BISHOP_OFFSET = 5 * NNUE_SQUARE_COUNT;
const WHITE_ROOK_OFFSET = 6 * NNUE_SQUARE_COUNT;
const BLACK_ROOK_OFFSET = 7 * NNUE_SQUARE_COUNT;
const WHITE_QUEEN_OFFSET = 8 * NNUE_SQUARE_COUNT;
const BLACK_QUEEN_OFFSET = 9 * NNUE_SQUARE_COUNT;
const KING_OFFSET = 10 * NNUE_SQUARE_COUNT;

const getPieceSquareOffset = (
  perspective: ColorType,
  pieceColor: ColorType,
  piece: number,
): number => {
  const isUs = pieceColor === perspective;

  if (piece === PAWN_INDEX) {
    return isUs ? WHITE_PAWN_OFFSET : BLACK_PAWN_OFFSET;
  }

  if (piece === KNIGHT_INDEX) {
    return isUs ? WHITE_KNIGHT_OFFSET : BLACK_KNIGHT_OFFSET;
  }

  if (piece === BISHOP_INDEX) {
    return isUs ? WHITE_BISHOP_OFFSET : BLACK_BISHOP_OFFSET;
  }

  if (piece === ROOK_INDEX) {
    return isUs ? WHITE_ROOK_OFFSET : BLACK_ROOK_OFFSET;
  }

  if (piece === QUEEN_INDEX) {
    return isUs ? WHITE_QUEEN_OFFSET : BLACK_QUEEN_OFFSET;
  }

  if (piece === KING_INDEX) {
    return KING_OFFSET;
  }

  return 0;
};

export const getPieceColorFromStateIndex = (stateIndex: number): ColorType =>
  stateIndex < 6 ? COLOR.WHITE : COLOR.BLACK;

export const makeHalfKaFeatureIndex = (
  perspective: ColorType,
  square: number,
  pieceColor: ColorType,
  piece: number,
  kingSquare: number,
): number => {
  const flip = perspective === COLOR.WHITE ? 0 : 56;
  const orientedKingSquare = kingSquare ^ flip;
  const orientedSquare = square ^ NNUE_ORIENT_TABLE[kingSquare] ^ flip;
  const kingBucket =
    NNUE_KING_BUCKETS[orientedKingSquare] * NNUE_PIECE_SQUARE_BUCKET_SIZE;

  return (
    orientedSquare +
    getPieceSquareOffset(perspective, pieceColor, piece) +
    kingBucket
  );
};

export const appendHalfKaActiveFeatures = (
  position: Position,
  perspective: ColorType,
  activeFeatures: Uint32Array,
  startIndex: number,
): number => {
  let count = startIndex;
  const kingSquare = position.kingSquares[perspective];

  for (let square = 0; square < position.pieceAt.length; square++) {
    const stateIndex = position.pieceAt[square];

    if (stateIndex === -1) {
      continue;
    }

    activeFeatures[count++] = makeHalfKaFeatureIndex(
      perspective,
      square,
      getPieceColorFromStateIndex(stateIndex),
      getPieceTypeFromStateIndex(stateIndex),
      kingSquare,
    );
  }

  return count;
};
