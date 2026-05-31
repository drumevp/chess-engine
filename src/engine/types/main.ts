export const COLOR = {
  WHITE: 0,
  BLACK: 1,
} as const;

export type ColorType = typeof COLOR[keyof typeof COLOR];

export const MOVE_FLAG = {
  QUIET: 0,
  CAPTURE: 1,
  DOUBLE_PAWN_PUSH: 2,
  KING_CASTLE: 3,
  QUEEN_CASTLE: 4,
  EN_PASSANT: 5,
  PROMOTION: 6,
  PROMOTION_CAPTURE: 7,
} as const;

export type MoveFlagType = typeof MOVE_FLAG[keyof typeof MOVE_FLAG];

export type Move = {
  from: number;
  to: number;

  color: ColorType;
  piece: number;

  capturedPiece?: number;
  promotionPiece?: number;

  flag: MoveFlagType;
};