import {
  BISHOP_INDEX,
  KING_INDEX,
  KNIGHT_INDEX,
  PAWN_INDEX,
  QUEEN_INDEX,
  ROOK_INDEX,
} from "../../engine/constants/piece";

export const STATIC_EXCHANGE_MAX_DEPTH = 32;

export const ATTACKER_ORDER = new Int8Array([
  PAWN_INDEX,
  KNIGHT_INDEX,
  BISHOP_INDEX,
  ROOK_INDEX,
  QUEEN_INDEX,
  KING_INDEX,
]);
