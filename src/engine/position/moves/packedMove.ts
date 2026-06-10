/**
 * MOVE refactor definition (from js object to packed integer)
 * 7  6  5  4 3 2 1  -  (2^n)
 * 64 32 16 8 4 2 1
 * Define as packed 32 bit integer
 * from: 0 - 63 (64 values) - 6 bits (64)
 * to: 0 - 63 (64 values) - 6 bits (64)
 * color: 0-1 (2 values) - 1 bit (0 or 1)
 * piece: 0-5 (6 values) - 3 bits
 * capturedPiece?: 0-5 (6 values) - 3 bits, where 111 (7) is null
 * promotionPiece?: 0-5 (6 values) - 3 bits, where 111 (7) is null
 * flag: 0-7 (8 values) - 3 bits
 * 
 * SUM OF ALL MAX BITS: 6 + 6 + 1 + 3 + 3 + 3 + 3 = 12 + 1 + 12 = 25bits
 * fits within uint32bit
 * 
 *   bits 22-24      bits 19-21        bits 16-18     bits 13-15    bit 12      bits 6-11    bits 0-5
 *  3bits(flag)  3bits(promotion)  3bits(captured)  3bits(piece)  1bit(color)  6bits(to)   6bits(from)
 *     100          100              100           100             1        100000      100000
 * 
 *  highest(flag) 1001001001001100000100000 lowest(from)
 * 
 */

import { ColorType } from "../../types/color";
import { MoveFlagType } from "../../types/move";

const FROM_SHIFT = 0;
const TO_SHIFT = 6;
const COLOR_SHIFT = 12;
const PIECE_SHIFT = 13;
const CAPTURED_SHIFT = 16;
const PROMOTION_SHIFT = 19;
const FLAG_SHIFT = 22;

// Since only captured piece and promotion piece can be null
// And they're both 3 bits, we set their null value to 7 (111)
export const ENCODE_MOVE_NO_PIECE = 7;

// Masks for obtaining shifted values for decoding
const SIX_BIT_MASK = 0b111111;
const THREE_BIT_MASK = 0b111;
const ONE_BIT_MASK = 0b1;

// ENCODING
export const encodeMove = (from: number, to: number, color: ColorType, piece: number, flag: MoveFlagType, capturedPiece: number = ENCODE_MOVE_NO_PIECE, promotionPiece: number = ENCODE_MOVE_NO_PIECE): number => {
  return (
    ((from & SIX_BIT_MASK) << FROM_SHIFT) |
    ((to & SIX_BIT_MASK) << TO_SHIFT) |
    ((color & ONE_BIT_MASK) << COLOR_SHIFT) |
    ((piece & THREE_BIT_MASK) << PIECE_SHIFT) |
    ((capturedPiece & THREE_BIT_MASK) << CAPTURED_SHIFT) |
    ((promotionPiece &  THREE_BIT_MASK) << PROMOTION_SHIFT) | 
    ((flag & THREE_BIT_MASK) << FLAG_SHIFT)
  )
}

// DECODING
// For decoding we use the unsigned right shift >>>
// In case the highest bit of the 32bit integer is set to 1,
// Using the signed right shift will set all the values to 1
export const moveDecodeFrom = (move: number): number => {
  return (move >>> FROM_SHIFT) & SIX_BIT_MASK;
}

export const moveDecodeTo = (move: number): number => {
  return (move >>> TO_SHIFT) & SIX_BIT_MASK;
}

export const moveDecodeColor = (move: number): ColorType => {
  return ((move >>> COLOR_SHIFT) & ONE_BIT_MASK) as ColorType;
}

export const moveDecodePiece = (move: number): number => {
  return (move >>> PIECE_SHIFT) & THREE_BIT_MASK;
}

export const moveDecodeCapturedPiece = (move: number): number | null => {
  const value = (move >>> CAPTURED_SHIFT) & THREE_BIT_MASK;

  if (value === ENCODE_MOVE_NO_PIECE) {
    return null;
  }

  return value;
}

export const moveDecodePromotionPiece = (move: number): number | null => {
  const value = (move >>> PROMOTION_SHIFT) & THREE_BIT_MASK;

  if (value === ENCODE_MOVE_NO_PIECE) {
    return null;
  }

  return value;
}

export const moveDecodeFlag = (move: number): MoveFlagType => {
  return ((move >>> FLAG_SHIFT) & THREE_BIT_MASK) as MoveFlagType;
}
