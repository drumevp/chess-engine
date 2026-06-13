import { MOVE_FLAG } from "../constants/move";
import { ColorType } from "./color";

export type MoveFlagType = (typeof MOVE_FLAG)[keyof typeof MOVE_FLAG];

export type Move = {
  from: number;
  to: number;

  color: ColorType;
  piece: number;

  capturedPiece: number | null;
  promotionPiece: number | null;

  flag: MoveFlagType;
};

export type SimpleMove = {
  from: number;
  to: number;
  promotionPiece: number | null;
};

export type MoveList = {
  moves: Uint32Array;
  count: number;
};

export type MoveGenerationContext = {
  stateLo: Uint32Array;
  stateHi: Uint32Array;

  allOccupancyLo: number;
  allOccupancyHi: number;
  ownOccupancyLo: number;
  ownOccupancyHi: number;
  enemyOccupancyLo: number;
  enemyOccupancyHi: number;

  color: ColorType;
  pieceAt: Int8Array;
  ownKingSquare: number;
  enemyKingSquare: number;
  enPassantSquare: number | null;
  castlingRights: number;
  moves: MoveList;
};
