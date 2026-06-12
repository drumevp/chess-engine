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
}

export type MoveList = {
  moves: Uint32Array;
  count: number;
};

export type MoveGenerationContext = {
  state: bigint[];
  color: ColorType;
  ownOccupancy: bigint;
  enemyOccupancy: bigint;
  allOccupancy: bigint;
  pieceAt: Int8Array;
  ownKingSquare: number;
  enemyKingSquare: number;
  enPassantSquare: number | null;
  castlingRights: number;
  moves: MoveList;
};
